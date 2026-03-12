import React, { useState, useEffect, useRef } from "react";
import { notification, Form, Input, Button, Upload, message, Divider, Space, Card, Spin, Modal, Dropdown, Menu } from "antd";
import { UploadOutlined, CloudUploadOutlined, FileOutlined, DeleteOutlined, EyeOutlined, PlusOutlined, MinusOutlined, CloseCircleOutlined, CameraOutlined, DownOutlined } from '@ant-design/icons';
import { UPLOAD, GET, DELETE } from "helpers/api_helper";
import { useNavigate } from "react-router-dom";
import CameraCapture from '../../../components/Common/CameraCapture';

// Location photo slot definitions (order matters)
const LOCATION_SLOTS = [
  { key: 'building',          label: 'Customer Building',                 defaultDescription: 'Customer Building' },
  { key: 'left_building',     label: 'Left to the Building',     defaultDescription: 'Left to Building'  },
  { key: 'opposite_building', label: 'Opposite to the Building', defaultDescription: 'Opp to Building'   },
  { key: 'right_building',    label: 'Right to the Building',    defaultDescription: 'Right to Building' },
];

const AddCustomerDocument = ({ customerId, customerName, onPrevious, onCancel }) => {
  const [form] = Form.useForm();

  // State for document fields
  const [aadhaarFields, setAadhaarFields] = useState([{ id: 0, file: null, loading: false }]);
  const [panFields,     setPanFields]     = useState([{ id: 0, file: null, loading: false }]);
  const [otherFields,   setOtherFields]   = useState([{ id: 0, file: null, loading: false }]);

  // Location slots: { slotKey, file, loading, active }
  // Only "building" is active by default
  const [locationSlots, setLocationSlots] = useState([
    { slotKey: 'building',          file: null, loading: false, active: true  },
    { slotKey: 'left_building',     file: null, loading: false, active: false },
    { slotKey: 'opposite_building', file: null, loading: false, active: false },
    { slotKey: 'right_building',    file: null, loading: false, active: false },
  ]);

  const [cameraVisible, setCameraVisible] = useState(false);
  const cameraFieldRef = useRef({ fieldId: null, fieldType: null });

  // State for existing documents
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [loadingDocuments,  setLoadingDocuments]  = useState(false);

  // State for preview modal
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewType,    setPreviewType]    = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [formUpdateTrigger, setFormUpdateTrigger] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    if (customerId) {
      fetchCustomerName();
      fetchExistingDocuments();
    }
  }, [customerId, form]);

  const fetchCustomerName = async () => {
    try {
      const response = await GET(`/api/customers/${customerId}/`);
      if (response?.status === 200 && response?.data?.customer_name) {
        form.setFieldsValue({ customer_name: response.data.customer_name });
      }
    } catch (error) {
      console.error('Failed to fetch customer name:', error);
    }
  };

  const openCamera = (fieldId, fieldType) => {
    cameraFieldRef.current = { fieldId, fieldType };
    setCameraVisible(true);
  };

  const handleCameraCapture = (file) => {
    const { fieldId, fieldType } = cameraFieldRef.current;

    if (fieldId === null || fieldId === undefined || !fieldType) {
      message.error('Camera field info missing. Please try again.');
      return;
    }

    if (!(file instanceof File)) {
      message.error('Invalid file received from camera');
      return;
    }

    if (fieldType === 'location_photo') {
      setLocationSlots(prev =>
        prev.map(slot => slot.slotKey === fieldId ? { ...slot, file } : slot)
      );
      cameraFieldRef.current = { fieldId: null, fieldType: null };
      return;
    }

    let setFieldsState, fields;
    switch (fieldType) {
      case 'aadhaar': setFieldsState = setAadhaarFields; fields = aadhaarFields; break;
      case 'pan':     setFieldsState = setPanFields;     fields = panFields;     break;
      case 'other':   setFieldsState = setOtherFields;   fields = otherFields;   break;
      default:
        message.error('Unknown document type. Please try again.');
        return;
    }

    setFieldsState(fields.map(f => f.id === fieldId ? { ...f, file } : f));
    cameraFieldRef.current = { fieldId: null, fieldType: null };
  };

  const getDescriptionValidation = (fieldId, descriptionFieldPrefix, file) => {
    const description = form.getFieldValue(`${descriptionFieldPrefix}_${fieldId}`);
    if (file && (!description || description.trim() === '')) {
      return { validateStatus: 'error', help: 'Enter description to upload the document' };
    }
    return { validateStatus: '', help: '' };
  };

  const initializeFieldsFromDocuments = (documents) => {
    const docsByType = {
      aadhaar:        documents.filter(d => d.document_type === 'aadhaar'),
      pan:            documents.filter(d => d.document_type === 'pan'),
      location_photo: documents.filter(d => d.document_type === 'location_photo'),
      other:          documents.filter(d => d.document_type === 'other'),
    };

    if (docsByType.aadhaar.length > 0)
      setAadhaarFields(docsByType.aadhaar.map((_, i) => ({ id: i, file: null, loading: false })));

    if (docsByType.pan.length > 0)
      setPanFields(docsByType.pan.map((_, i) => ({ id: i, file: null, loading: false })));

    if (docsByType.other.length > 0)
      setOtherFields(docsByType.other.map((_, i) => ({ id: i, file: null, loading: false })));

    // For location slots, activate the ones that already have documents
    if (docsByType.location_photo.length > 0) {
      setLocationSlots(prev =>
        prev.map((slot, idx) => ({
          ...slot,
          active: idx < docsByType.location_photo.length || slot.slotKey === 'building',
        }))
      );
    }
  };

  const fetchExistingDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const response = await GET(`/api/customer-documents/?customer_id=${customerId}`);

      if (response && response.error) {
        setExistingDocuments([]);
        return;
      }

      let documents = [];
      if (response && Array.isArray(response.data))  documents = response.data;
      else if (response && Array.isArray(response))  documents = response;

      setExistingDocuments(documents);

      if (documents.length > 0) {
        initializeFieldsFromDocuments(documents);

        setTimeout(() => {
          const formValues = {};
          const docsByType = {
            aadhaar: documents.filter(d => d.document_type === 'aadhaar'),
            pan:     documents.filter(d => d.document_type === 'pan'),
            other:   documents.filter(d => d.document_type === 'other'),
          };

          docsByType.aadhaar.forEach((doc, i) => {
            if (doc.document_description) formValues[`aadhaar_description_${i}`] = doc.document_description;
          });
          docsByType.pan.forEach((doc, i) => {
            if (doc.document_description) formValues[`pan_description_${i}`] = doc.document_description;
          });
          docsByType.other.forEach((doc, i) => {
            if (doc.document_description) formValues[`other_description_${i}`] = doc.document_description;
          });

          form.setFieldsValue(formValues);
        }, 100);
      }
    } catch (error) {
      setExistingDocuments([]);
      if (!error.message?.includes('Customer not found')) {
        notification.error({
          message: 'Error',
          description: 'Failed to fetch existing documents',
          duration: 5,
        });
      }
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleDeleteDocument = async (docId, fileName) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: `Are you sure you want to delete the document: ${fileName || 'Document'}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        setLoadingDocuments(true);
        try {
          const response = await DELETE(`/api/customer-documents/${docId}/?customer_id=${customerId}`);

          if (response?.status === 204 || response?.status === 200) {
            notification.success({
              message: 'Deleted',
              description: `${fileName || 'Document'} deleted successfully.`,
              duration: 5,
            });

            const deletedDoc = existingDocuments.find(doc => doc.id === docId);

            // Clear description form field for non-location types
            if (deletedDoc && deletedDoc.document_type !== 'location_photo') {
              const docsOfSameType = existingDocuments.filter(doc => doc.document_type === deletedDoc.document_type);
              const deletedIndex   = docsOfSameType.findIndex(doc => doc.id === docId);
              const prefixMap = {
                aadhaar: 'aadhaar_description',
                pan:     'pan_description',
                other:   'other_description',
              };
              const prefix = prefixMap[deletedDoc.document_type];
              if (prefix && deletedIndex !== -1) {
                form.setFieldValue(`${prefix}_${deletedIndex}`, '');
              }
            }

            // If it's a location doc, deactivate that slot
            if (deletedDoc?.document_type === 'location_photo') {
              const locDocs = existingDocuments.filter(d => d.document_type === 'location_photo');
              const locIdx  = locDocs.findIndex(d => d.id === docId);
              if (locIdx !== -1 && LOCATION_SLOTS[locIdx]) {
                const slotKey = LOCATION_SLOTS[locIdx].slotKey;
                setLocationSlots(prev =>
                  prev.map(s =>
                    s.slotKey === slotKey
                      ? { ...s, active: slotKey === 'building', file: null }
                      : s
                  )
                );
              }
            }

            const updatedDocs = existingDocuments.filter(doc => doc.id !== docId);
            setExistingDocuments(updatedDocs);

            if (updatedDocs.length > 0) {
              initializeFieldsFromDocuments(updatedDocs);

              setTimeout(() => {
                const formValues = {};
                const docsByType = {
                  aadhaar: updatedDocs.filter(d => d.document_type === 'aadhaar'),
                  pan:     updatedDocs.filter(d => d.document_type === 'pan'),
                  other:   updatedDocs.filter(d => d.document_type === 'other'),
                };

                docsByType.aadhaar.forEach((doc, i) => {
                  if (doc.document_description) formValues[`aadhaar_description_${i}`] = doc.document_description;
                });
                docsByType.pan.forEach((doc, i) => {
                  if (doc.document_description) formValues[`pan_description_${i}`] = doc.document_description;
                });
                docsByType.other.forEach((doc, i) => {
                  if (doc.document_description) formValues[`other_description_${i}`] = doc.document_description;
                });

                form.setFieldsValue(formValues);
                setFormUpdateTrigger(prev => prev + 1);
              }, 100);
            } else {
              // If no documents left, reset to initial state
              setAadhaarFields([{ id: 0, file: null, loading: false }]);
              setPanFields([{ id: 0, file: null, loading: false }]);
              setOtherFields([{ id: 0, file: null, loading: false }]);
              setLocationSlots(prev => prev.map((s, i) => ({ ...s, active: i === 0, file: null })));
              form.resetFields();
            }
          } else {
            notification.error({
              message: 'Deletion Failed',
              description: response?.data?.error || 'Failed to delete the document.',
              duration: 5,
            });
          }
        } catch (error) {
          notification.error({
            message: 'Error',
            description: error.response?.data?.error || error.message || 'An error occurred during deletion.',
            duration: 5,
          });
        } finally {
          setLoadingDocuments(false);
        }
      },
    });
  };

  const getDocumentsByType = (type) => {
    if (!Array.isArray(existingDocuments)) return [];
    return existingDocuments.filter(doc => doc.document_type === type);
  };

  const SecurePDFPreview = ({ url }) => {
    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    return (
      <div style={{ margin: 0, padding: 0 }}>
        <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
          <Button
            type="primary"
            size="small"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            Open PDF in New Tab
          </Button>
        </div>
        <iframe
          src={googleViewerUrl}
          title="PDF Preview"
          width="100%"
          height="600px"
          style={{ border: '1px solid #d9d9d9', borderRadius: 4, display: 'block', margin: 0 }}
        />
      </div>
    );
  };

  const viewDocument = async (documentData, fileName) => {
    let documentUrl    = documentData;
    let actualFileName = fileName;

    if (typeof documentData === 'object' && documentData !== null) {
      if (documentData.file_url)        documentUrl = documentData.file_url;
      else if (documentData.signed_url) documentUrl = documentData.signed_url;
      else if (documentData.url)        documentUrl = documentData.url;

      if (!actualFileName && documentData.document_file?.original_name)
        actualFileName = documentData.document_file.original_name;
      else if (!actualFileName && documentData.document_file_name)
        actualFileName = documentData.document_file_name;
    }

    if (!documentUrl || typeof documentUrl !== 'string') {
      notification.error({ message: 'Error', description: 'Document URL not found or invalid', duration: 5 });
      return;
    }

    let fileExtension = '';
    if (actualFileName && typeof actualFileName === 'string') {
      fileExtension = actualFileName.split('.').pop().toLowerCase();
    } else if (typeof documentUrl === 'string') {
      fileExtension = documentUrl.split('?')[0].split('.').pop().toLowerCase();
    }

    if (fileExtension === 'pdf') {
      setPreviewType('pdf');
      setPreviewContent(documentUrl);
      setPreviewVisible(true);
      return;
    }

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
      setPreviewType('image');
      setPreviewContent(documentUrl);
      setPreviewVisible(true);
      setPreviewLoading(true);
      return;
    }

    try {
      window.open(documentUrl, '_blank');
    } catch (error) {
      notification.error({ message: 'Error', description: 'Failed to open document', duration: 5 });
    }
  };

  /* ───────────── LOCATION SLOT HELPERS ───────────── */

  const activateLocationSlot = (slotKey) => {
    setLocationSlots(prev =>
      prev.map(s => s.slotKey === slotKey ? { ...s, active: true } : s)
    );
  };

  const deactivateLocationSlot = (slotKey) => {
    if (slotKey === 'building') return; // building is always shown
    setLocationSlots(prev =>
      prev.map(s => s.slotKey === slotKey ? { ...s, active: false, file: null } : s)
    );
  };

  const handleLocationFileSelect = (file, slotKey) => {
    const originalFile = file.originFileObj || file;
    setLocationSlots(prev =>
      prev.map(s => s.slotKey === slotKey ? { ...s, file: originalFile } : s)
    );
    message.success(`${originalFile.name} selected successfully`);
    return false;
  };

  const handleLocationClearFile = (slotKey) => {
    setLocationSlots(prev =>
      prev.map(s => s.slotKey === slotKey ? { ...s, file: null } : s)
    );
    message.info('File selection cleared.');
  };

  const uploadLocationDocument = async (slotKey, file) => {
    if (!customerId) {
      notification.error({ message: 'Error', description: 'Customer ID is missing.', duration: 5 });
      return;
    }
    if (!file) {
      notification.error({ message: 'Error', description: 'Please select a file first', duration: 2 });
      return;
    }
    if (!(file instanceof File)) {
      notification.error({ message: 'Error', description: 'Invalid file object. Please select the file again.', duration: 5 });
      return;
    }

     const slotDef = LOCATION_SLOTS.find(s => s.key === slotKey);
  const slotLabel = slotDef?.label || slotKey;
  const defaultDescription = slotDef?.defaultDescription || slotLabel;

    setLocationSlots(prev =>
      prev.map(s => s.slotKey === slotKey ? { ...s, loading: true } : s)
    );

    try {
      const formData = new FormData();
      formData.append('document_type', 'location_photo');
      formData.append('document_description', slotLabel);
       formData.append('document_description', defaultDescription); 
      formData.append('document_file', file, file.name);

      const response = await UPLOAD(`/api/customer-documents/?customer_id=${customerId}`, formData);

      setLocationSlots(prev =>
        prev.map(s => s.slotKey === slotKey ? { ...s, loading: false } : s)
      );

      if (response.status === 400) {
        notification.error({
          message: 'Upload Failed',
          description: response?.data?.document_file?.[0] || response?.data?.error || 'Failed to upload document',
          duration: 5,
        });
        return;
      }

      if (response.status === 201 || response.status === 200) {
        notification.success({
          message: 'Success',
          description: `${slotLabel} photo uploaded successfully`,
          duration: 5,
        });
        setLocationSlots(prev =>
          prev.map(s => s.slotKey === slotKey ? { ...s, file: null } : s)
        );
        fetchExistingDocuments();
      }
    } catch (error) {
      setLocationSlots(prev =>
        prev.map(s => s.slotKey === slotKey ? { ...s, loading: false } : s)
      );
      notification.error({
        message: 'Upload Failed',
        description: error.response?.data?.error || error.message || 'An error occurred',
        duration: 5,
      });
    }
  };

  /* ───────────── NON-LOCATION ADD / REMOVE ───────────── */

  const addAadhaarField = () => {
    if (aadhaarFields.length < 2)
      setAadhaarFields([...aadhaarFields, { id: Date.now(), file: null, loading: false }]);
  };
  const addPanField = () => {
    if (panFields.length < 2)
      setPanFields([...panFields, { id: Date.now(), file: null, loading: false }]);
  };
  const addOtherField = () => {
    if (otherFields.length < 4)
      setOtherFields([...otherFields, { id: Date.now(), file: null, loading: false }]);
  };

  const removeAadhaarField = (id) => {
    if (aadhaarFields.length > 1) setAadhaarFields(aadhaarFields.filter(f => f.id !== id));
  };
  const removePanField = (id) => {
    if (panFields.length > 1) setPanFields(panFields.filter(f => f.id !== id));
  };
  const removeOtherField = (id) => {
    if (otherFields.length > 1) setOtherFields(otherFields.filter(f => f.id !== id));
  };

  const handleFileSelect = (file, fieldId, setFieldsState, fields) => {
    const originalFile = file.originFileObj || file;
    setFieldsState(fields.map(f => f.id === fieldId ? { ...f, file: originalFile } : f));
    message.success(`${originalFile.name} selected successfully`);
    return false;
  };

  const handleClearFile = (fieldId, setFieldsState, fields) => {
    setFieldsState(fields.map(f => f.id === fieldId ? { ...f, file: null } : f));
    message.info('File selection cleared.');
  };

  const uploadDocument = async (fieldId, file, type, descriptionField, setFieldsState, fields) => {
    const description = form.getFieldValue(`${descriptionField}_${fieldId}`);

    if (!customerId) {
      notification.error({ message: 'Error', description: 'Customer ID is missing. Please complete personal information first.', duration: 5 });
      return;
    }
    if (!file) {
      notification.error({ message: 'Error', description: 'Please select a file first', duration: 2 });
      return;
    }
    if (!description || description.trim() === '') {
      form.setFields([{
        name: `${descriptionField}_${fieldId}`,
        errors: ['Please enter description to upload the document'],
      }]);
      return;
    }
    if (!(file instanceof File)) {
      notification.error({ message: 'Error', description: 'Invalid file object. Please select the file again.', duration: 5 });
      return;
    }

    setFieldsState(fields.map(f => f.id === fieldId ? { ...f, loading: true } : f));

    try {
      const formData = new FormData();
      formData.append('document_type', type);
      formData.append('document_description', description);
      formData.append('document_file', file, file.name);

      const response = await UPLOAD(`/api/customer-documents/?customer_id=${customerId}`, formData);

      setFieldsState(fields.map(f => f.id === fieldId ? { ...f, loading: false } : f));

      if (response.status === 400) {
        const errorMessage =
          response?.data?.document_file?.[0] ||
          response?.data?.error ||
          response?.data?.message ||
          'Failed to upload document';
        notification.error({ message: 'Upload Failed', description: errorMessage, duration: 5 });
        return;
      }

      if (response.status === 201 || response.status === 200) {
        notification.success({ message: 'Success', description: `${type} document uploaded successfully`, duration: 5 });
        setFieldsState(fields.map(f => f.id === fieldId ? { ...f, file: null } : f));
        form.setFieldValue(`${descriptionField}_${fieldId}`, '');
        fetchExistingDocuments();
      }
    } catch (error) {
      setFieldsState(fields.map(f => f.id === fieldId ? { ...f, loading: false } : f));
      notification.error({
        message: 'Upload Failed',
        description: error.response?.data?.error || error.message || 'An error occurred during upload',
        duration: 5,
      });
    }
  };

  const handleReset = () => {
    form.resetFields();
    setAadhaarFields([{ id: 0, file: null, loading: false }]);
    setPanFields([{ id: 0, file: null, loading: false }]);
    setOtherFields([{ id: 0, file: null, loading: false }]);
    setLocationSlots(prev => prev.map((s, i) => ({ ...s, active: i === 0, file: null })));
  };

  /* ───────────── RENDER LOCATION PHOTO SECTION ───────────── */

  const renderLocationPhotoSection = () => {
    const existingLocDocs = getDocumentsByType('location_photo');
    const activeSlots     = locationSlots.filter(s => s.active);
    const allSlotsActive  = locationSlots.every(s => s.active);

    // Build dropdown menu with only inactive slots as options
    const dropdownMenu = (
      <Menu
        onClick={({ key }) => activateLocationSlot(key)}
        items={locationSlots
          .filter(s => !s.active)
          .map(s => {
            const def = LOCATION_SLOTS.find(d => d.key === s.slotKey);
            return { key: s.slotKey, label: def?.label || s.slotKey };
          })
        }
      />
    );

    return (
      <>
        {activeSlots.map((slot, idx) => {
          const slotDef      = LOCATION_SLOTS.find(s => s.key === slot.slotKey);
          const slotLabel    = slotDef?.label || slot.slotKey;
          const existingDoc  = existingLocDocs[idx] || null;
          const hasExisting  = !!existingDoc;
          const fileName     = slot.file?.name || '';
          const truncatedFileName = fileName.length > 30 ? fileName.substring(0, 30) + '...' : fileName;
          const isLastActive = idx === activeSlots.length - 1;

          return (
            <div key={slot.slotKey} className="mb-3">

              {/* Slot label */}
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '8px', color: '#333' }}>
                {slotLabel}
              </div>

              {/* Existing document card */}
              {hasExisting && existingDoc && (
                <div style={{ marginBottom: '12px' }}>
                  <Card size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
                        <div style={{ fontSize: '12px', fontWeight: '500' }}>
                          {existingDoc.document_file?.original_name
                            ? existingDoc.document_file.original_name.length > 15
                              ? existingDoc.document_file.original_name.slice(0, 15) + '...'
                              : existingDoc.document_file.original_name
                            : 'Document'}
                        </div>
                      </div>
                      <Space>
                        <Button
                          type="link"
                          icon={<EyeOutlined />}
                          onClick={() => viewDocument(existingDoc, existingDoc.document_file?.original_name)}
                          size="small"
                        >
                          View
                        </Button>
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteDocument(existingDoc.id, existingDoc.document_file_name)}
                          size="small"
                        >
                          Delete
                        </Button>
                      </Space>
                    </div>
                  </Card>
                </div>
              )}

              {/* Upload row — NO description field for location */}
              <div className="row">
                <div className="col-md-6">
                  <Form.Item label="File Upload" style={{ marginBottom: '8px' }}>
                    <Space.Compact style={{ width: '100%', marginBottom: slot.file ? '8px' : '0' }}>
                      <Upload
                        maxCount={1}
                        multiple={false}
                        beforeUpload={(file) => handleLocationFileSelect(file, slot.slotKey)}
                        accept=".pdf,.png,.jpeg,.jpg"
                        fileList={slot.file ? [{ uid: slot.slotKey, name: slot.file.name, status: 'done' }] : []}
                        showUploadList={false}
                        disabled={hasExisting}
                      >
                        <Button
                          icon={<UploadOutlined />}
                          disabled={hasExisting}
                          style={{ width: '100%', textAlign: 'left', paddingLeft: '12px' }}
                        >
                          Browse
                        </Button>
                      </Upload>
                      <Button
                        icon={<CameraOutlined />}
                        onClick={() => openCamera(slot.slotKey, 'location_photo')}
                        disabled={hasExisting}
                      >
                        Camera
                      </Button>
                    </Space.Compact>

                    {slot.file && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 11px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        backgroundColor: '#f6ffed',
                      }}>
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#52c41a',
                            fontWeight: '500',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 'calc(100% - 30px)',
                          }}
                          title={fileName}
                        >
                          <FileOutlined style={{ marginRight: '5px' }} />
                          {truncatedFileName}
                        </div>
                        <Button
                          icon={<CloseCircleOutlined />}
                          onClick={() => handleLocationClearFile(slot.slotKey)}
                          danger
                          type="text"
                          size="small"
                          title="Clear selected file"
                          style={{ padding: '0', height: 'auto', marginLeft: '8px' }}
                        />
                      </div>
                    )}
                  </Form.Item>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <Button
                  type="primary"
                  icon={<CloudUploadOutlined />}
                  onClick={() => uploadLocationDocument(slot.slotKey, slot.file)}
                  loading={slot.loading}
                  disabled={!slot.file || hasExisting}
                >
                  Upload
                </Button>

                {/* + dropdown — only on the last active slot when more slots are available */}
                {isLastActive && !allSlotsActive && (
                  <Dropdown overlay={dropdownMenu} trigger={['click']}>
                    <Button
                      type="primary"
                      shape="circle"
                      icon={<PlusOutlined />}
                      style={{
                        width: 35,
                        height: 35,
                        backgroundColor: '#28a745',
                        borderColor: '#28a745',
                        color: '#fff',
                      }}
                    />
                  </Dropdown>
                )}

                {/* − remove button (not for the building slot) */}
                {slot.slotKey !== 'building' && !hasExisting && (
                  <Button
                    type="primary"
                    danger
                    shape="circle"
                    icon={<MinusOutlined />}
                    onClick={() => deactivateLocationSlot(slot.slotKey)}
                    style={{ width: 35, height: 35, backgroundColor: 'red', borderColor: 'red' }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </>
    );
  };

  /* ───────────── RENDER NON-LOCATION DOCUMENT FIELDS ───────────── */

  const renderDocumentFields = (fields, setFieldsState, type, descriptionFieldPrefix, addHandler, removeHandler, maxFields) => {
    const existingDocs = getDocumentsByType(type);

    return (
      <>
        {fields.map((field, index) => {
          const fileName           = field.file?.name || '';
          const truncatedFileName  = fileName.length > 30 ? fileName.substring(0, 30) + '...' : fileName;
          const hasExistingDoc     = existingDocs.length > index;
          const existingDoc        = hasExistingDoc ? existingDocs[index] : null;
          const currentDescription = form.getFieldValue(`${descriptionFieldPrefix}_${field.id}`);
          const isUploadDisabled   = !field.file || !currentDescription || currentDescription.trim() === '';

          return (
            <div key={field.id} className="mb-3">

              {/* Existing document card */}
              {hasExistingDoc && existingDoc && (
                <div style={{ marginBottom: '16px' }}>
                  <Card size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
                        <div style={{ fontSize: '12px', fontWeight: '500' }}>
                          {existingDoc.document_file?.original_name
                            ? existingDoc.document_file.original_name.length > 15
                              ? existingDoc.document_file.original_name.slice(0, 15) + '...'
                              : existingDoc.document_file.original_name
                            : 'Document'}
                        </div>
                      </div>
                      <Space>
                        <Button
                          type="link"
                          icon={<EyeOutlined />}
                          onClick={() => viewDocument(existingDoc, existingDoc.document_file?.original_name)}
                          size="small"
                        >
                          View
                        </Button>
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteDocument(existingDoc.id, existingDoc.document_file_name)}
                          size="small"
                        >
                          Delete
                        </Button>
                      </Space>
                    </div>
                  </Card>
                </div>
              )}

              {/* File Upload + Description row */}
              <div className="row">
                {/* File Upload Column */}
                <div className="col-md-6">
                  <Form.Item label="File Upload" style={{ marginBottom: '8px' }}>
                    <Space.Compact style={{ width: '100%', marginBottom: field.file ? '8px' : '0' }}>
                      <Upload
                        maxCount={1}
                        multiple={false}
                        beforeUpload={(file) => handleFileSelect(file, field.id, setFieldsState, fields)}
                        accept=".pdf,.png,.jpeg,.jpg"
                        fileList={field.file ? [{ uid: field.id, name: field.file.name, status: 'done' }] : []}
                        showUploadList={false}
                        disabled={hasExistingDoc}
                      >
                        <Button
                          icon={<UploadOutlined />}
                          disabled={hasExistingDoc}
                          style={{ width: '100%', textAlign: 'left', paddingLeft: '12px' }}
                        >
                          Browse
                        </Button>
                      </Upload>
                      <Button
                        icon={<CameraOutlined />}
                        onClick={() => openCamera(field.id, type)}
                        title="Capture with Camera"
                        disabled={hasExistingDoc}
                      >
                        Camera
                      </Button>
                    </Space.Compact>

                    {field.file && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 11px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        backgroundColor: '#f6ffed',
                      }}>
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#52c41a',
                            fontWeight: '500',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 'calc(100% - 30px)',
                          }}
                          title={fileName}
                        >
                          <FileOutlined style={{ marginRight: '5px' }} />
                          {truncatedFileName}
                        </div>
                        <Button
                          icon={<CloseCircleOutlined />}
                          onClick={() => handleClearFile(field.id, setFieldsState, fields)}
                          danger
                          type="text"
                          size="small"
                          title="Clear selected file"
                          style={{ padding: '0', height: 'auto', marginLeft: '8px' }}
                        />
                      </div>
                    )}
                  </Form.Item>
                </div>

                {/* Description Column */}
                <div className="col-md-6">
                  <Form.Item
                    label="Description"
                    name={`${descriptionFieldPrefix}_${field.id}`}
                    validateStatus={getDescriptionValidation(field.id, descriptionFieldPrefix, field.file).validateStatus}
                    help={getDescriptionValidation(field.id, descriptionFieldPrefix, field.file).help}
                    style={{ marginBottom: '8px' }}
                    rules={[
                      {
                        validator: (_, value) => {
                          if (field.file && (!value || value.trim() === ''))
                            return Promise.reject('Enter description to upload the document');
                          return Promise.resolve();
                        },
                      },
                      {
                        pattern: /^[a-zA-Z].*$/,
                        message: 'Description must start with an alphabet character',
                      },
                    ]}
                  >
                    <Input.TextArea
                      placeholder={`Enter ${type} description`}
                      autoSize={{ minRows: 1, maxRows: 6 }}
                      allowClear
                      disabled={hasExistingDoc}
                      onKeyDown={(e) => {
                        const value = e.currentTarget.value;
                        if (value.length === 0 && e.key.length === 1 && !/[a-zA-Z]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length > 0 && !/^[a-zA-Z]/.test(value)) {
                          e.target.value = value.replace(/^[^a-zA-Z]+/, '');
                        }
                        form.validateFields([`${descriptionFieldPrefix}_${field.id}`]);
                        setFormUpdateTrigger(prev => prev + 1);
                      }}
                    />
                  </Form.Item>
                </div>
              </div>

              {/* Buttons Row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <Button
                  type="primary"
                  icon={<CloudUploadOutlined />}
                  onClick={() => uploadDocument(field.id, field.file, type, descriptionFieldPrefix, setFieldsState, fields)}
                  loading={field.loading}
                  disabled={isUploadDisabled || hasExistingDoc}
                >
                  Upload
                </Button>

                {/* + button on last field when below max */}
                {index === fields.length - 1 && fields.length < maxFields && (
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<PlusOutlined />}
                    onClick={addHandler}
                    style={{
                      width: 35,
                      height: 35,
                      backgroundColor: '#28a745',
                      borderColor: '#28a745',
                      color: '#fff',
                    }}
                  />
                )}

                {/* − button when more than 1 field and no existing doc */}
                {fields.length > 1 && !hasExistingDoc && (
                  <Button
                    type="primary"
                    danger
                    shape="circle"
                    icon={<MinusOutlined />}
                    onClick={() => removeHandler(field.id)}
                    style={{ width: 35, height: 35, backgroundColor: 'red', borderColor: 'red' }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </>
    );
  };

  /* ───────────── MAIN RENDER ───────────── */
  return (
    <div className="page-content" style={{ marginRight: '10px', marginLeft: '-10px', maxWidth: '100%' }}>
      <div className="container-fluid" style={{ marginTop: -100, padding: 0 }}>
        <div className="row">
          <div className="col-md-12">
            <Spin spinning={loadingDocuments} tip="Loading documents...">
              <Form
                form={form}
                layout="vertical"
                style={{ padding: 0, marginRight: '-20px', marginBottom: '-30px', marginTop: '20px' }}
              >
                <div className="container" style={{ padding: 0 }}>

                  {/* Customer Name */}
                  <div className="row mb-1 mt-2">
                    <div className="col-md-12">
                      <Form.Item label="Customer Name" name="customer_name">
                        <Input
                          placeholder="Customer Name"
                          size="large"
                          disabled
                          style={{ backgroundColor: '#f5f5f5', color: '#000', fontWeight: '600' }}
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Aadhaar */}
                  <Divider style={{ borderTop: '2px solid #d9d9d9' }} />
                  <Divider orientation="center" style={{ borderTopWidth: '3px', borderColor: '#d9d9d9' }}>
                    Aadhaar Document
                  </Divider>
                  {renderDocumentFields(
                    aadhaarFields, setAadhaarFields,
                    'aadhaar', 'aadhaar_description',
                    addAadhaarField, removeAadhaarField, 2
                  )}

                  {/* PAN */}
                  <Divider style={{ borderTop: '2px solid #d9d9d9' }} />
                  <Divider orientation="center" style={{ borderTopWidth: '3px', borderColor: '#d9d9d9' }}>
                    PAN Document
                  </Divider>
                  {renderDocumentFields(
                    panFields, setPanFields,
                    'pan', 'pan_description',
                    addPanField, removePanField, 2
                  )}

                  {/* Location Photo */}
                  <Divider style={{ borderTop: '2px solid #d9d9d9' }} />
                  <Divider orientation="center" style={{ borderTopWidth: '3px', borderColor: '#d9d9d9' }}>
                    Location Photo
                  </Divider>
                  {renderLocationPhotoSection()}

                  {/* Other */}
                  <Divider style={{ borderTop: '2px solid #d9d9d9' }} />
                  <Divider orientation="center" style={{ borderTopWidth: '3px', borderColor: '#d9d9d9' }}>
                    Other Document
                  </Divider>
                  {renderDocumentFields(
                    otherFields, setOtherFields,
                    'other', 'other_description',
                    addOtherField, removeOtherField, 4
                  )}

                  {/* Footer Buttons */}
                  <div className="text-center mt-4" style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    gap: '10px',
                  }}>
                    <Button type="primary" size="large" onClick={onPrevious}>
                      Previous
                    </Button>
                    <Button size="large" onClick={() => navigate('/view-customer')}>
                      Cancel
                    </Button>
                  </div>

                </div>
              </Form>
            </Spin>

            {/* Preview Modal */}
            <Modal
              open={previewVisible}
              title="Document Preview"
              footer={[
                <Button key="close" onClick={() => setPreviewVisible(false)}>
                  Close
                </Button>,
                <Button key="download" type="primary" onClick={() => window.open(previewContent, '_blank')}>
                  Open in New Tab
                </Button>,
              ]}
              onCancel={() => setPreviewVisible(false)}
              width={900}
              centered
              destroyOnClose
              bodyStyle={{ padding: '16px', margin: 0 }}
              style={{ top: 20 }}
            >
              <Spin spinning={previewLoading && previewType === 'image'}>
                {previewType === 'pdf' && previewContent && (
                  <SecurePDFPreview url={previewContent} />
                )}
                {previewType === 'image' && previewContent && (
                  <div style={{ textAlign: 'center' }}>
                    <img
                      src={previewContent}
                      alt="Document Preview"
                      style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                      onLoad={() => setPreviewLoading(false)}
                      onError={() => {
                        setPreviewLoading(false);
                        notification.error({ message: 'Error', description: 'Failed to load image', duration: 5 });
                      }}
                    />
                  </div>
                )}
              </Spin>
            </Modal>
          </div>
        </div>
      </div>

      <CameraCapture
        visible={cameraVisible}
        onClose={() => {
          setCameraVisible(false);
          cameraFieldRef.current = { fieldId: null, fieldType: null };
        }}
        onCapture={handleCameraCapture}
      />
    </div>
  );
};

export default AddCustomerDocument;