import { useState, useEffect, useRef } from "react";
import { notification, Form, Input, Button, Upload, message, Divider, Space, Card, Modal, Spin } from "antd";
import {
  UploadOutlined, CloudUploadOutlined, PlusOutlined, MinusOutlined,
  BankOutlined, FileTextOutlined, CameraOutlined, EyeOutlined,
  DeleteOutlined, FileOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { ToastContainer } from "react-toastify";
import Loader from "components/Common/Loader";
import { ADD_BRANCH } from "helpers/url_helper";
import { UPLOAD_CERTIFCATE, GET_BRANCHES, CREATE_BRANCH, PUT, DELETE } from "helpers/api_helper";
import { useParams, useNavigate } from "react-router-dom";
import { ERROR_MESSAGES, FILE_MESSAGES } from "helpers/errorMessages";
import InputWithAddon from "components/Common/InputWithAddon";
import CameraCapture from '../../../components/Common/CameraCapture';
import '../responsive.css';

const AddBranch = () => {
  const [loader, setLoader] = useState(false);
  const [form] = Form.useForm();
  const params = useParams();
  const navigate = useNavigate();

  const [branchId, setBranchId] = useState(null);
  const [isBasicInfoSaved, setIsBasicInfoSaved] = useState(false);

  const [docFields, setDocFields] = useState([{ id: 0, file: null, loading: false }]);
  const [existingDocs, setExistingDocs] = useState([]);

  const [cameraVisible, setCameraVisible] = useState(false);
  const cameraFieldRef = useRef({ fieldId: null });

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [formUpdateTrigger, setFormUpdateTrigger] = useState(0);

  // ── Fetch branch documents ────────────────────────────────────────────────
  const fetchBranchDocuments = async (id) => {
    try {
      const response = await GET_BRANCHES(`/api/branch-documents/?branch_id=${id}`);
      if (response.status === 200) {
        const docs = response.data?.results || [];
        setExistingDocs(docs);

        if (docs.length > 0) {
          setDocFields(docs.map((_, i) => ({ id: i, file: null, loading: false })));
          form.setFieldsValue({
            branch_documents: docs.map((doc) => ({
              document_type: doc.document_type || '',
              document_description: doc.document_description || '',
            })),
          });
        } else {
          setDocFields([{ id: 0, file: null, loading: false }]);
          form.setFieldsValue({ branch_documents: [{ document_type: '', document_description: '' }] });
        }
      }
    } catch (error) {
      console.error('Failed to fetch branch documents:', error);
    }
  };

  // ── Fetch branch details (edit mode) ─────────────────────────────────────
  const getBranchDetails = async () => {
    setLoader(true);
    try {
      const response = await GET_BRANCHES(`${ADD_BRANCH}${params.id}`);
      if (response.status === 200) {
        const { data } = response;
        setBranchId(params.id);
        setIsBasicInfoSaved(true);

        form.setFieldsValue({
          branch_name: data.branch_name,
          branch_address: data.branch_address,
        });

        await fetchBranchDocuments(params.id);
      }
    } catch (error) {
      notification.error({ message: 'Error', description: 'Failed to fetch branch details', duration: 5 });
    } finally {
      setLoader(false);
    }
  };

  useEffect(() => {
    if (params?.id) {
      getBranchDetails();
    } else {
      setDocFields([{ id: 0, file: null, loading: false }]);
      setIsBasicInfoSaved(false);
      setBranchId(null);
    }
  }, [params?.id]);

  // ── Description filter ────────────────────────────────────────────────────
  const descriptionValueFilter = (value) => {
    if (value.length === 0) return '';
    let filtered = '';
    for (let i = 0; i < value.length; i++) {
      if (i === 0) { if (/[A-Za-z]/.test(value[i])) filtered += value[i]; }
      else { if (/[A-Za-z0-9\s]/.test(value[i])) filtered += value[i]; }
    }
    return filtered;
  };

  // ── Camera ────────────────────────────────────────────────────────────────
  const openCamera = (fieldId) => {
    cameraFieldRef.current = { fieldId };
    setCameraVisible(true);
  };

  const handleCameraCapture = (file) => {
    const { fieldId } = cameraFieldRef.current;
    if (!file || !file.name || !file.type || file.size === undefined) {
      message.error('Invalid file received from camera');
      return;
    }
    setDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, file } : f)));
    message.success(`${file.name} selected successfully`);
    setFormUpdateTrigger((t) => t + 1);
    cameraFieldRef.current = { fieldId: null };
  };

  // ── File Select / Clear ───────────────────────────────────────────────────
  const handleFileSelect = (file, fieldId) => {
    const original = file.originFileObj || file;
    setDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, file: original } : f)));
    message.success(`${original.name} selected successfully`);
    setFormUpdateTrigger((t) => t + 1);
    return false;
  };

  const handleClearFile = (fieldId) => {
    setDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, file: null } : f)));
    message.info('File selection cleared.');
    setFormUpdateTrigger((t) => t + 1);
  };

  // ── Upload single document ────────────────────────────────────────────────
  const uploadDocument = async (fieldId, index, currentBranchId) => {
    const fieldObj = docFields.find((f) => f.id === fieldId);
    const file = fieldObj?.file;

    if (!file) return true;

    const docType = form.getFieldValue(['branch_documents', index, 'document_type']);
    const docDescription = form.getFieldValue(['branch_documents', index, 'document_description']);

    if (!docType || docType.trim() === '') {
      form.setFields([{ name: ['branch_documents', index, 'document_type'], errors: ['Please enter document type'] }]);
      return false;
    }
    if (!docDescription || docDescription.trim() === '') {
      form.setFields([{ name: ['branch_documents', index, 'document_description'], errors: ['Please enter description'] }]);
      return false;
    }
    if (!(file instanceof File)) {
      notification.error({ message: 'Error', description: 'Invalid file object. Please select the file again.', duration: 5 });
      return false;
    }

    setDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, loading: true } : f)));

    const formData = new FormData();
    formData.append('document_file', file, file.name);
    formData.append('document_type', docType);
    formData.append('document_description', docDescription);

    try {
      const response = await UPLOAD_CERTIFCATE(`/api/branch-documents/?branch_id=${currentBranchId}`, formData);
      setDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, loading: false, file: null } : f)));

      if (response.status === 200 || response.status === 201) {
        form.setFieldValue(['branch_documents', index, 'document_type'], '');
        form.setFieldValue(['branch_documents', index, 'document_description'], '');
        return true;
      } else {
        throw new Error(response.statusText || 'Upload failed');
      }
    } catch (error) {
      setDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, loading: false } : f)));
      notification.error({ message: 'Upload Failed', description: error.message || FILE_MESSAGES.UPLOAD_FAILED, duration: 5 });
      return false;
    }
  };

  // ── MAIN SAVE ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      await form.validateFields(['branch_name', 'branch_address']);
    } catch {
      notification.error({ message: 'Validation Error', description: 'Please fill in all required fields', duration: 5 });
      return;
    }

    const values = form.getFieldsValue();
    setLoader(true);

    try {
      let currentBranchId = branchId;

      // ── Step 1: POST or PUT basic info (skip POST if already saved in ADD mode) ──
      if (!isBasicInfoSaved || params.id) {
        const orgId = localStorage.getItem("org_id");
        const payload = {
          branch_name: values.branch_name,
          branch_address: values.branch_address,
          organization: orgId ? parseInt(orgId) : undefined,
        };

        const response = params.id
          ? await PUT(`${ADD_BRANCH}${params.id}/`, payload)
          : await CREATE_BRANCH(ADD_BRANCH, payload);

        if (response.status === 200 || response.status === 201) {
          if (params.id) {
            currentBranchId = params.id;
            notification.success({ message: 'Branch Updated', description: 'Basic info updated successfully.', duration: 5 });
          } else {
            currentBranchId = response.data.id;
            setBranchId(currentBranchId);
            setIsBasicInfoSaved(true);
            notification.success({ message: 'Branch Created', description: 'Branch created. Now upload documents.', duration: 5 });
          }
        } else if (response.status === 400) {
          const errorMessages = [];
          if (response?.data) {
            Object.keys(response.data).forEach((key) => {
              errorMessages.push(Array.isArray(response.data[key]) ? response.data[key][0] : response.data[key]);
            });
          }
          notification.error({ message: 'Error', description: errorMessages.join('\n') || 'Failed to save branch', duration: 4 });
          return;
        }
      }

      // ── Step 2: Upload documents (only fields with a file selected) ────────
      const fieldsWithFiles = docFields.filter((f) => f.file !== null);

      if (fieldsWithFiles.length > 0) {
        let allUploadsSuccessful = true;

        for (const field of fieldsWithFiles) {
          const index = docFields.findIndex((f) => f.id === field.id);
          const success = await uploadDocument(field.id, index, currentBranchId);
          if (!success) allUploadsSuccessful = false;
        }

        if (allUploadsSuccessful) {
          notification.success({ message: 'Documents Uploaded', description: 'All documents uploaded successfully.', duration: 5 });
        }

        await fetchBranchDocuments(currentBranchId);
      }

      // In ADD mode navigate after done; in EDIT stay on page
      if (!params.id) {
        navigate('/branch/list');
      }

    } catch (error) {
      notification.error({
        message: 'Error',
        description: error?.response?.data?.detail || error.message || 'An error occurred. Please try again.',
        duration: 5,
      });
    } finally {
      setLoader(false);
    }
  };

  // ── Delete existing doc ───────────────────────────────────────────────────
  const handleDeleteDocument = (docId, fileName) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: `Are you sure you want to delete: ${fileName || 'Document'}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const deleteResponse = await DELETE(`/api/branch-documents/${docId}/?branch_id=${branchId}`);
          if (deleteResponse.status !== 200 && deleteResponse.status !== 204) {
            notification.error({ message: 'Error', description: 'Failed to delete document.', duration: 5 });
            return;
          }

          const deletedIndex = existingDocs.findIndex((d) => d.id === docId);
          setExistingDocs((prev) => prev.filter((d) => d.id !== docId));

          if (deletedIndex !== -1) {
            const currentDocs = form.getFieldValue('branch_documents') || [];
            currentDocs.splice(deletedIndex, 1);

            if (currentDocs.length === 0) {
              form.setFieldsValue({ branch_documents: [{ document_type: '', document_description: '' }] });
              setDocFields([{ id: 0, file: null, loading: false }]);
            } else {
              form.setFieldsValue({ branch_documents: [...currentDocs] });
              setDocFields((prev) => prev.filter((_, i) => i !== deletedIndex));
            }
          }

          notification.success({ message: 'Deleted', description: `${fileName || 'Document'} deleted successfully.`, duration: 5 });
        } catch (error) {
          notification.error({ message: 'Error', description: error.message || 'Deletion failed.', duration: 5 });
        }
      },
    });
  };

  // ── Add / Remove doc fields ───────────────────────────────────────────────
  const addDocField = () => {
    const newId = Date.now();
    setDocFields((prev) => [...prev, { id: newId, file: null, loading: false }]);
    const current = form.getFieldValue('branch_documents') || [];
    form.setFieldsValue({ branch_documents: [...current, { document_type: '', document_description: '' }] });
  };

  const removeDocField = (fieldId, index) => {
    setDocFields((prev) => prev.filter((f) => f.id !== fieldId));
    const current = form.getFieldValue('branch_documents') || [];
    current.splice(index, 1);
    form.setFieldsValue({ branch_documents: [...current] });
  };

  // ── Preview ───────────────────────────────────────────────────────────────
  const SecurePDFPreview = ({ url }) => {
    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    return (
      <div style={{ margin: 0, padding: 0 }}>
        <div style={{ marginBottom: 8 }}>
          <Button type="primary" size="small" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
            Open PDF in New Tab
          </Button>
        </div>
        <iframe src={googleViewerUrl} title="PDF Preview" width="100%" height="600px"
          style={{ border: '1px solid #d9d9d9', borderRadius: 4, display: 'block', margin: 0 }} />
      </div>
    );
  };

  const viewDocument = (documentUrl, fileName) => {
    if (!documentUrl || typeof documentUrl !== 'string') {
      notification.error({ message: 'Error', description: 'Document URL not found or invalid', duration: 5 });
      return;
    }
    let fileExtension = '';
    if (fileName) {
      fileExtension = fileName.split('.').pop().toLowerCase();
    } else {
      fileExtension = documentUrl.split('?')[0].split('.').pop().toLowerCase();
    }
    if (fileExtension === 'pdf') {
      setPreviewType('pdf'); setPreviewContent(documentUrl); setPreviewVisible(true);
      return;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
      setPreviewType('image'); setPreviewContent(documentUrl); setPreviewVisible(true); setPreviewLoading(true);
      return;
    }
    window.open(documentUrl, '_blank');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {loader && <Loader />}

      <div className="page-content" style={{ marginRight: '10px', marginLeft: '-10px', maxWidth: '100%' }}>
        <div className="container-fluid" style={{ marginTop: -100, padding: 0 }}>
          <div className="row">
            <div className="col-md-12">

              <div className="add-branch-header">
                <h2 className="add-branch-title">
                  {params.id ? 'Edit Branch' : 'Add Branch'}
                </h2>
              </div>

              <Form
                form={form}
                layout="vertical"
                className="add-branch-form"
                style={{ padding: 0, marginRight: '-20px', marginBottom: '-30px' }}
              >
                <div className="container" style={{ padding: 0 }}>

                  {/* ── Basic Info ────────────────────────────────────────── */}
                  <div className="row mb-1 mt-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Branch Name"
                        name="branch_name"
                        rules={[
                          { required: true, message: ERROR_MESSAGES.BRANCH.BRANCH_NAME_REQUIRED },
                          { pattern: /^[A-Za-z][A-Za-z0-9\-\s]*$/, message: 'Branch name must start with an alphabet' },
                        ]}
                      >
                        <InputWithAddon
                          icon={<BankOutlined />}
                          placeholder="Enter branch name"
                          onValueFilter={(value) => {
                            if (value.length === 0) return '';
                            let filtered = '';
                            for (let i = 0; i < value.length; i++) {
                              if (i === 0) { if (/[A-Za-z]/.test(value[i])) filtered += value[i]; }
                              else { if (/[A-Za-z0-9\-\s]/.test(value[i])) filtered += value[i]; }
                            }
                            return filtered;
                          }}
                        />
                      </Form.Item>
                    </div>
                    <div className="col-md-6">
                      <Form.Item
                        label="Branch Address"
                        name="branch_address"
                        rules={[{ required: true, message: ERROR_MESSAGES.BRANCH.BRANCH_ADDRESS_REQUIRED }]}
                      >
                        <Input.TextArea
                          placeholder="Enter branch address"
                          allowClear
                          autoSize={{ minRows: 2, maxRows: 8 }}
                          style={{ resize: 'both' }}
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* ── Documents — visible in EDIT always, in ADD after first save ── */}
                  {(params.id || isBasicInfoSaved) && (
                    <>
                      <Divider style={{ borderTop: '2px solid #d9d9d9' }} />
                      <Divider orientation="center" style={{ borderTopWidth: '3px', borderColor: '#d9d9d9' }}>
                        Branch Documents
                      </Divider>

                      {/* Existing documents */}
                      {existingDocs.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          {existingDocs.map((doc, idx) => (
                            <Card key={doc.id || idx} size="small" style={{ marginBottom: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <FileOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
                                  <div>
                                    <div style={{ fontSize: '12px', fontWeight: '500' }}>
                                      {doc.document_file?.original_name
                                        ? doc.document_file.original_name.length > 15
                                          ? doc.document_file.original_name.slice(0, 15) + '...'
                                          : doc.document_file.original_name
                                        : 'Document'}
                                    </div>
                                    {/* {doc.document_type && (
                                      <div style={{ fontSize: '12px', color: '#1890ff' }}>{doc.document_type}</div>
                                    )}
                                    {doc.document_description && (
                                      <div style={{ fontSize: '12px', color: '#666' }}>{doc.document_description}</div>
                                    )} */}
                                  </div>
                                </div>
                                <Space>
                                  <Button type="link" icon={<EyeOutlined />} size="small"
                                    onClick={() => viewDocument(doc.signed_url, doc.document_file?.original_name)}>
                                    View
                                  </Button>
                                  <Button type="link" danger icon={<DeleteOutlined />} size="small"
                                    onClick={() => handleDeleteDocument(doc.id, doc.document_file?.original_name)}>
                                    Delete
                                  </Button>
                                </Space>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* New document upload fields */}
                      {docFields.map((field, index) => {
                        const docType = form.getFieldValue(['branch_documents', index, 'document_type']);
                        const docDesc = form.getFieldValue(['branch_documents', index, 'document_description']);
                        const isUploadDisabled = !field.file || !docType || docType.trim() === '' || !docDesc || docDesc.trim() === '';

                        return (
                          <div key={field.id} className="mb-3">
                            {docFields.length > 1 && (
                              <Divider orientation="center" style={{ borderTopWidth: '2px', borderColor: '#d9d9d9' }}>
                                {`Document ${index + 1}`}
                              </Divider>
                            )}

                            <div className="row">
                              {/* File Upload */}
                              <div className="col-md-4">
                                <Form.Item label="File Upload" style={{ marginBottom: '8px' }}>
                                  <Space.Compact style={{ width: '100%', marginBottom: field.file ? '8px' : '0' }}>
                                    <Upload
                                      maxCount={1}
                                      multiple={false}
                                      beforeUpload={(file) => handleFileSelect(file, field.id)}
                                      accept=".pdf,.csv,.png,.jpeg,.jpg,.doc,.docx"
                                      showUploadList={false}
                                      fileList={[]}
                                    >
                                      <Button icon={<UploadOutlined />} style={{ width: '100%', textAlign: 'left', paddingLeft: '12px' }}>
                                        Browse
                                      </Button>
                                    </Upload>
                                    <Button icon={<CameraOutlined />} onClick={() => openCamera(field.id)} title="Capture with Camera">
                                      Camera
                                    </Button>
                                  </Space.Compact>

                                  {field.file && (
                                    <div style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                      padding: '4px 11px', border: '1px solid #d9d9d9',
                                      borderRadius: '6px', backgroundColor: '#f6ffed',
                                    }}>
                                      <div style={{
                                        fontSize: '13px', color: '#52c41a', fontWeight: '500',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        maxWidth: 'calc(100% - 30px)',
                                      }} title={field.file.name}>
                                        <FileOutlined style={{ marginRight: '5px' }} />
                                        {field.file.name.length > 25 ? field.file.name.substring(0, 25) + '...' : field.file.name}
                                      </div>
                                      <Button
                                        icon={<CloseCircleOutlined />}
                                        onClick={() => handleClearFile(field.id)}
                                        danger type="text" size="small"
                                        style={{ padding: '0', height: 'auto', marginLeft: '8px' }}
                                      />
                                    </div>
                                  )}
                                </Form.Item>
                              </div>

                              {/* Document Type */}
                              <div className="col-md-4">
                                <Form.Item
                                  label="Document Type"
                                  name={['branch_documents', index, 'document_type']}
                                  style={{ marginBottom: '8px' }}
                                  rules={[
                                    {
                                      validator: (_, value) => {
                                        if (field.file && (!value || value.trim() === '')) {
                                          return Promise.reject('Please enter document type');
                                        }
                                        return Promise.resolve();
                                      },
                                    },
                                    { pattern: /^[A-Za-z][A-Za-z0-9\s]*$/, message: 'Must start with an alphabet' },
                                  ]}
                                >
                                  <InputWithAddon
                                    icon={<FileTextOutlined />}
                                    placeholder="Enter document type"
                                    onValueFilter={descriptionValueFilter}
                                    onChange={() => setFormUpdateTrigger((t) => t + 1)}
                                  />
                                </Form.Item>
                              </div>

                              {/* Document Description */}
                              <div className="col-md-4">
                                <Form.Item
                                  label="Description"
                                  name={['branch_documents', index, 'document_description']}
                                  style={{ marginBottom: '8px' }}
                                  rules={[
                                    {
                                      validator: (_, value) => {
                                        if (field.file && (!value || value.trim() === '')) {
                                          return Promise.reject('Enter description to upload the document');
                                        }
                                        return Promise.resolve();
                                      },
                                    },
                                    { pattern: /^[A-Za-z][A-Za-z0-9\s]*$/, message: 'Must start with an alphabet' },
                                  ]}
                                >
                                  <InputWithAddon
                                    icon={<FileTextOutlined />}
                                    placeholder="Enter description"
                                    onValueFilter={descriptionValueFilter}
                                    onChange={() => setFormUpdateTrigger((t) => t + 1)}
                                  />
                                </Form.Item>
                              </div>
                            </div>

                            {/* Plus / Minus buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                              {index === docFields.length - 1 && (
                                <Button
                                  type="primary"
                                  shape="circle"
                                  icon={<PlusOutlined />}
                                  onClick={addDocField}
                                  style={{ width: 35, height: 35, backgroundColor: '#28a745', borderColor: '#28a745', color: '#fff' }}
                                />
                              )}
                              {docFields.length > 1 && (
                                <Button
                                  type="primary"
                                  danger
                                  shape="circle"
                                  icon={<MinusOutlined />}
                                  onClick={() => removeDocField(field.id, index)}
                                  style={{ width: 35, height: 35, backgroundColor: 'red', borderColor: 'red' }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* ── Save / Cancel ─────────────────────────────────────── */}
                  <div className="text-center mt-4" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                    <Button type="primary" size="large" onClick={handleSave} loading={loader}>
                      {params.id ? 'Update Branch' : 'Save Branch'}
                    </Button>
                    <Button size="large" onClick={() => navigate('/branch/list')}>
                      Cancel
                    </Button>
                  </div>

                </div>
              </Form>
            </div>
          </div>
        </div>
        <ToastContainer />
      </div>

      {/* Camera */}
      <CameraCapture
        visible={cameraVisible}
        onClose={() => {
          setCameraVisible(false);
          cameraFieldRef.current = { fieldId: null };
        }}
        onCapture={handleCameraCapture}
      />

      {/* Preview Modal */}
      <Modal
        open={previewVisible}
        title="Document Preview"
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>Close</Button>,
          <Button key="open" type="primary" onClick={() => window.open(previewContent, '_blank')}>Open in New Tab</Button>,
        ]}
        onCancel={() => setPreviewVisible(false)}
        width={900}
        centered
        destroyOnClose
        bodyStyle={{ padding: '16px', margin: 0 }}
        style={{ top: 20 }}
      >
        <Spin spinning={previewLoading && previewType === 'image'}>
          {previewType === 'pdf' && previewContent && <SecurePDFPreview url={previewContent} />}
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
    </>
  );
};

export default AddBranch;