import { useState, useEffect, useRef } from "react";
import { notification, Form, Input, Button, Upload, message, Divider, Space, Card, Modal, Spin, Tabs } from "antd";
import {
  UploadOutlined, CloudUploadOutlined, PlusOutlined, MinusOutlined,
  BankOutlined, FileTextOutlined, CameraOutlined, EyeOutlined,
  DeleteOutlined, FileOutlined, CloseCircleOutlined, SwapOutlined,
} from '@ant-design/icons';
import { ToastContainer } from "react-toastify";
import Loader from "components/Common/Loader";
import { ADD_BRANCH } from "helpers/url_helper";
import { UPLOAD_CERTIFCATE, GET_BRANCHES, CREATE_BRANCH, PUT, DELETE, POST } from "helpers/api_helper";
import { useParams, useNavigate } from "react-router-dom";
import { ERROR_MESSAGES, FILE_MESSAGES } from "helpers/errorMessages";
import InputWithAddon from "components/Common/InputWithAddon";
import CameraCapture from '../../../components/Common/CameraCapture';
import '../responsive.css';

const AddBranch = () => {
  const [loader, setLoader] = useState(false);
  const [sessionUpdating, setSessionUpdating] = useState(false);
  const [form] = Form.useForm();
  const params = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("1");
  const [branchId, setBranchId] = useState(null);
  const [isBasicInfoSaved, setIsBasicInfoSaved] = useState(false);

  // Session switch modal
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [pendingBranchId, setPendingBranchId] = useState(null);
  const [pendingBranchName, setPendingBranchName] = useState(null);

  // Existing docs from API
  const [existingDocs, setExistingDocs] = useState([]);

  // New upload fields
  const [newDocFields, setNewDocFields] = useState([]);

  // Controls whether the new-doc upload area is expanded (toggled by + button in edit mode)
  const [showNewDocFields, setShowNewDocFields] = useState(false);

  const [docsModified, setDocsModified] = useState(false);

  const [cameraVisible, setCameraVisible] = useState(false);
  const cameraFieldRef = useRef({ fieldId: null });

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [formUpdateTrigger, setFormUpdateTrigger] = useState(0);

  const scrollRef = useRef(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => setIsScrolled(el.scrollTop > 60);
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Update session branch ─────────────────────────────────────────────────
  const updateBranchSession = async (branchId) => {
    setSessionUpdating(true);
    try {
      const response = await POST("/api/session-change-branch/", { branch_id: branchId });
      if (response?.status === 200 || response?.status === 201) {
        notification.success({
          message: "Session Branch Updated",
          description: "Your session branch has been changed to the newly created branch.",
        });
        return true;
      } else {
        notification.error({
          message: "Update Failed",
          description: response?.message || "Could not update branch session.",
        });
        return false;
      }
    } catch (err) {
      console.error("Error updating branch session:", err);
      notification.error({
        message: "Update Failed",
        description: err?.message || "An error occurred while updating branch.",
      });
      return false;
    } finally {
      setSessionUpdating(false);
    }
  };

  // ── Fetch branch documents ────────────────────────────────────────────────
  const fetchBranchDocuments = async (id) => {
    try {
      const response = await GET_BRANCHES(`/api/branch-documents/?branch_id=${id}`);
      if (response.status === 200) {
        const docs = response.data?.results || [];
        setExistingDocs(docs);
        setDocsModified(false);

        if (docs.length === 0) {
          // No existing docs: show upload fields normally (same as add mode)
          const firstId = Date.now();
          setNewDocFields([{ id: firstId, file: null, loading: false }]);
          setShowNewDocFields(true);
          form.setFieldsValue({ new_branch_documents: [{ document_type: '', document_description: '' }] });
        } else {
          // Has existing docs: collapse new-doc area, only + button shown
          setNewDocFields([]);
          setShowNewDocFields(false);
          form.setFieldsValue({ new_branch_documents: [] });
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
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("tab") === "documents") {
        setActiveTab("2");
        window.history.replaceState(null, "", window.location.pathname);
      }
    } else {
      // Add mode: show one empty field by default, no existing docs
      const firstId = Date.now();
      setNewDocFields([{ id: firstId, file: null, loading: false }]);
      setShowNewDocFields(true);
      setExistingDocs([]);
      setIsBasicInfoSaved(false);
      setBranchId(null);
      setDocsModified(false);
      form.setFieldsValue({ new_branch_documents: [{ document_type: '', document_description: '' }] });
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
    setNewDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, file } : f)));
    message.success(`${file.name} selected successfully`);
    setFormUpdateTrigger((t) => t + 1);
    setDocsModified(true);
    cameraFieldRef.current = { fieldId: null };
  };

  // ── File Select / Clear ───────────────────────────────────────────────────
  const handleFileSelect = (file, fieldId) => {
    const original = file.originFileObj || file;
    setNewDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, file: original } : f)));
    message.success(`${original.name} selected successfully`);
    setFormUpdateTrigger((t) => t + 1);
    setDocsModified(true);
    return false;
  };

  const handleClearFile = (fieldId) => {
    setNewDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, file: null } : f)));
    message.info('File selection cleared.');
    setFormUpdateTrigger((t) => t + 1);
  };

  // ── Upload single document (per-field button) ─────────────────────────────
  const uploadDocument = async (fieldId, index, currentBranchId) => {
    const fieldObj = newDocFields.find((f) => f.id === fieldId);
    const file = fieldObj?.file;

    const docType = form.getFieldValue(['new_branch_documents', index, 'document_type']);
    const docDescription = form.getFieldValue(['new_branch_documents', index, 'document_description']);

    if (!file) {
      notification.error({ message: 'Error', description: 'Please select a file first.', duration: 3 });
      return false;
    }
    if (!docType || docType.trim() === '') {
      form.setFields([{ name: ['new_branch_documents', index, 'document_type'], errors: ['Please enter document name'] }]);
      return false;
    }
    if (!docDescription || docDescription.trim() === '') {
      form.setFields([{ name: ['new_branch_documents', index, 'document_description'], errors: ['Please enter description'] }]);
      return false;
    }
    if (!(file instanceof File)) {
      notification.error({ message: 'Error', description: 'Invalid file object. Please select the file again.', duration: 5 });
      return false;
    }

    setNewDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, loading: true } : f)));

    const formData = new FormData();
    formData.append('document_file', file, file.name);
    formData.append('document_type', docType);
    formData.append('document_description', docDescription);

    try {
      const response = await UPLOAD_CERTIFCATE(`/api/branch-documents/?branch_id=${currentBranchId}`, formData);
      setNewDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, loading: false, file: null } : f)));

      if (response.status === 200 || response.status === 201) {
        notification.success({ message: 'Upload Successful', description: `"${docType}" document uploaded successfully.`, duration: 4 });
        form.setFieldValue(['new_branch_documents', index, 'document_type'], '');
        form.setFieldValue(['new_branch_documents', index, 'document_description'], '');
        setFormUpdateTrigger((t) => t + 1);
        // Refresh — also resets newDocFields & collapses the upload area
        await fetchBranchDocuments(currentBranchId);
        return true;
      } else {
        throw new Error(response.statusText || 'Upload failed');
      }
    } catch (error) {
      setNewDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, loading: false } : f)));
      notification.error({ message: 'Upload Failed', description: error.message || FILE_MESSAGES.UPLOAD_FAILED, duration: 5 });
      return false;
    }
  };

  // ── Save Basic Branch Info (Tab 1) ────────────────────────────────────────
  const handleSaveBasicInfo = async () => {
    try {
      await form.validateFields(['branch_name', 'branch_address']);
    } catch {
      notification.error({ message: 'Validation Error', description: 'Please fill in all required fields', duration: 5 });
      return;
    }

    const values = form.getFieldsValue();
    setLoader(true);

    try {
      const orgId = localStorage.getItem("org_id");
      const payload = {
        branch_name: values.branch_name,
        branch_address: values.branch_address,
        organization: orgId ? parseInt(orgId) : undefined,
      };

      let response;
      if (params.id) {
        response = await PUT(`${ADD_BRANCH}${params.id}/`, payload);
      } else {
        response = await CREATE_BRANCH(ADD_BRANCH, payload);
      }

      if (response.status === 200 || response.status === 201) {
        if (params.id) {
          localStorage.setItem('selected_branch_id', params.id);
          localStorage.setItem('selected_branch_name', values.branch_name);
          notification.success({ message: 'Branch Updated', description: `"${values.branch_name}" has been updated successfully.`, duration: 5 });
          setActiveTab("2");
          await fetchBranchDocuments(params.id);
        } else {
          const newBranchId = response.data.id;
          const newBranchName = response.data.branch_name || values.branch_name;
          localStorage.setItem('selected_branch_id', String(newBranchId));
          localStorage.setItem('selected_branch_name', newBranchName);
          setBranchId(newBranchId);
          setIsBasicInfoSaved(true);
          setPendingBranchId(newBranchId);
          setPendingBranchName(newBranchName);
          setSessionModalVisible(true);
        }
      } else if (response.status === 400) {
        const errorMessages = [];
        if (response?.data) {
          Object.keys(response.data).forEach((key) => {
            errorMessages.push(Array.isArray(response.data[key]) ? response.data[key][0] : response.data[key]);
          });
        }
        notification.error({ message: 'Error', description: errorMessages.join('\n') || 'Failed to save branch', duration: 4 });
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

  // ── Session Modal: Confirm switch ─────────────────────────────────────────
  const handleSessionConfirm = async () => {
    await updateBranchSession(pendingBranchId);
    setSessionModalVisible(false);
    notification.success({
      message: 'Branch Created',
      description: `"${pendingBranchName}" has been created successfully.`,
      duration: 2,
    });
    setTimeout(() => {
      window.location.href = `/branch/edit/${pendingBranchId}?tab=documents`;
    }, 1200);
  };

  // ── Done button — uploads happen per-field, just navigate away ────────────
  const handleSaveDocuments = async () => {
    navigate('/branch/list');
  };

  // ── Delete existing doc ───────────────────────────────────────────────────
  const handleDeleteDocument = (docId, fileName) => {
    const doc = existingDocs.find((d) => d.id === docId);
    const docType = doc?.document_type || fileName || 'Document';
    Modal.confirm({
      title: 'Confirm Delete',
      content: `Are you sure you want to delete the "${docType}" document?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const currentBranchId = branchId || params.id;
          const deleteResponse = await DELETE(`/api/branch-documents/${docId}/?branch_id=${currentBranchId}`);
          if (deleteResponse.status !== 200 && deleteResponse.status !== 204) {
            notification.error({ message: 'Error', description: 'Failed to delete document.', duration: 5 });
            return;
          }
          const updatedDocs = existingDocs.filter((d) => d.id !== docId);
          setExistingDocs(updatedDocs);
          setDocsModified(true);
          notification.success({ message: 'Deleted', description: `"${docType}" document deleted successfully.`, duration: 5 });

          // If no docs remain, show upload fields normally
          if (updatedDocs.length === 0) {
            const firstId = Date.now();
            setNewDocFields([{ id: firstId, file: null, loading: false }]);
            setShowNewDocFields(true);
            form.setFieldsValue({ new_branch_documents: [{ document_type: '', document_description: '' }] });
          }
        } catch (error) {
          notification.error({ message: 'Error', description: error.message || 'Deletion failed.', duration: 5 });
        }
      },
    });
  };

  // ── Expand the new-doc upload area (+ button clicked in edit mode) ─────────
  const handleShowNewDocFields = () => {
    const firstId = Date.now();
    setNewDocFields([{ id: firstId, file: null, loading: false }]);
    setShowNewDocFields(true);
    form.setFieldsValue({ new_branch_documents: [{ document_type: '', document_description: '' }] });
  };

  // ── Add another row inside the open upload area ───────────────────────────
  const addNewDocField = () => {
    const newId = Date.now();
    setNewDocFields((prev) => [...prev, { id: newId, file: null, loading: false }]);
    const current = form.getFieldValue('new_branch_documents') || [];
    form.setFieldsValue({ new_branch_documents: [...current, { document_type: '', document_description: '' }] });
    setDocsModified(true);
  };

  // ── Remove a row; if last row removed, collapse the section ──────────────
  const removeNewDocField = (fieldId, index) => {
    const updated = newDocFields.filter((f) => f.id !== fieldId);
    if (updated.length === 0) {
      setNewDocFields([]);
      setShowNewDocFields(false);
      form.setFieldsValue({ new_branch_documents: [] });
      return;
    }
    setNewDocFields(updated);
    const current = form.getFieldValue('new_branch_documents') || [];
    current.splice(index, 1);
    form.setFieldsValue({ new_branch_documents: [...current] });
  };

  // ── Tab change guard ──────────────────────────────────────────────────────
  const handleTabChange = (key) => {
    if (key === "2" && !isBasicInfoSaved && !params.id) {
      notification.warning({
        message: 'Save Branch Info First',
        description: 'Please save the branch information before uploading documents.',
        duration: 5,
      });
      return;
    }
    setActiveTab(key);
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

  // ── Reusable: render upload fields (used in both branches of the condition) ─
  const renderUploadFields = (offsetForDocNumber = 0) => {
    const currentBranchId = branchId || params.id;

    return newDocFields.map((field, index) => {
      const globalDocNumber = offsetForDocNumber + index + 1;
      const docType = form.getFieldValue(['new_branch_documents', index, 'document_type']);
      const docDesc = form.getFieldValue(['new_branch_documents', index, 'document_description']);
      const isUploadDisabled =
        !field.file ||
        !docType || docType.trim() === '' ||
        !docDesc || docDesc.trim() === '';

      return (
        <div key={field.id} className="mb-3">
          {newDocFields.length > 1 && (
            <Divider orientation="center" style={{ borderTopWidth: '2px', borderColor: '#d9d9d9' }}>
              {`Document ${globalDocNumber}`}
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
                label="Document Name"
                name={['new_branch_documents', index, 'document_type']}
                style={{ marginBottom: '8px' }}
                rules={[
                  {
                    validator: (_, value) => {
                      if (field.file && (!value || value.trim() === '')) {
                        return Promise.reject('Please enter document name');
                      }
                      return Promise.resolve();
                    },
                  },
                  { pattern: /^[A-Za-z][A-Za-z0-9\s]*$/, message: 'Must start with an alphabet' },
                ]}
              >
                <InputWithAddon
                  icon={<FileTextOutlined />}
                  placeholder="Enter document Name"
                  onValueFilter={descriptionValueFilter}
                  onChange={() => { setFormUpdateTrigger((t) => t + 1); setDocsModified(true); }}
                />
              </Form.Item>
            </div>

            {/* Document Description */}
            <div className="col-md-4">
              <Form.Item
                label="Description"
                name={['new_branch_documents', index, 'document_description']}
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
                  onChange={() => { setFormUpdateTrigger((t) => t + 1); setDocsModified(true); }}
                />
              </Form.Item>
            </div>
          </div>

          {/* Upload + Plus / Minus buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              loading={field.loading}
              disabled={isUploadDisabled}
              onClick={() => uploadDocument(field.id, index, currentBranchId)}
            >
              Upload
            </Button>

            {index === newDocFields.length - 1 && (
              <Button
                type="primary"
                shape="circle"
                icon={<PlusOutlined />}
                onClick={addNewDocField}
                style={{ width: 35, height: 35, backgroundColor: '#28a745', borderColor: '#28a745', color: '#fff' }}
              />
            )}

            <Button
              type="primary"
              danger
              shape="circle"
              icon={<MinusOutlined />}
              onClick={() => removeNewDocField(field.id, index)}
              style={{ width: 35, height: 35, backgroundColor: 'red', borderColor: 'red' }}
            />
          </div>
        </div>
      );
    });
  };

  // ── Documents Tab Content ─────────────────────────────────────────────────
  const renderDocumentsTab = () => {
    const totalExisting = existingDocs.length;
    const hasExistingDocs = totalExisting > 0;

    return (
      <div className="add-branch-form-container">

        {/* ── Existing Documents ── */}
        {existingDocs.map((doc, idx) => {
          const displayName = doc.document_file?.original_name || 'Document';
          const truncatedName = displayName.length > 20 ? displayName.slice(0, 20) + '...' : displayName;

          return (
            <div key={doc.id} className="mb-3">
              <Divider orientation="center" style={{ borderTopWidth: '2px', borderColor: '#d9d9d9' }}>
                {`Document ${idx + 1}`}
              </Divider>

              <div className="row">
                {/* Uploaded file info */}
                <div className="col-md-4">
                  <Form.Item label="Uploaded File" style={{ marginBottom: '8px' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 11px', border: '1px solid #d9d9d9',
                      borderRadius: '6px', backgroundColor: '#f0f5ff',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <FileOutlined style={{ color: '#1890ff', fontSize: '16px', flexShrink: 0 }} />
                        <span style={{
                          fontSize: '13px', color: '#1890ff', fontWeight: 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }} title={displayName}>
                          {truncatedName}
                        </span>
                      </div>
                      <Space size={4}>
                        <Button type="link" icon={<EyeOutlined />} size="small" style={{ padding: '0 4px' }}
                          onClick={() => viewDocument(doc.signed_url, doc.document_file?.original_name)} />
                        <Button type="link" danger icon={<DeleteOutlined />} size="small" style={{ padding: '0 4px' }}
                          onClick={() => handleDeleteDocument(doc.id, doc.document_file?.original_name)} />
                      </Space>
                    </div>
                  </Form.Item>
                </div>

                {/* Document Type (read-only) */}
                <div className="col-md-4">
                  <Form.Item label="Document Name" style={{ marginBottom: '8px' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 11px', border: '1px solid #d9d9d9',
                      borderRadius: '6px', backgroundColor: '#fafafa', minHeight: '36px',
                    }}>
                      <FileTextOutlined style={{ color: '#8c8c8c' }} />
                      <span style={{ fontSize: '13px', color: '#333' }}>{doc.document_type || '—'}</span>
                    </div>
                  </Form.Item>
                </div>

                {/* Description (read-only) */}
                <div className="col-md-4">
                  <Form.Item label="Description" style={{ marginBottom: '8px' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 11px', border: '1px solid #d9d9d9',
                      borderRadius: '6px', backgroundColor: '#fafafa', minHeight: '36px',
                    }}>
                      <FileTextOutlined style={{ color: '#8c8c8c' }} />
                      <span style={{ fontSize: '13px', color: '#333' }}>{doc.document_description || '—'}</span>
                    </div>
                  </Form.Item>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── New Document Section ── */}
        {hasExistingDocs ? (
          /*
           * EDIT MODE — documents already exist:
           *   • Collapsed  → show only a centred green + button
           *   • Expanded   → show the upload fields with a divider header
           */
          !showNewDocFields ? (
            // ── Collapsed: just the + button ──
            <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '24px 0 16px' }}>
              <Button
                type="primary"
                shape="circle"
                icon={<PlusOutlined />}
                onClick={handleShowNewDocFields}
                title="Add new document"
                style={{ width: 40, height: 40, backgroundColor: '#28a745', borderColor: '#28a745', color: '#fff' }}
              />
            </div>
          ) : (
            // ── Expanded: divider + upload fields ──
            <>
              <Divider orientation="center" style={{ borderColor: '#d9d9d9' }}>Add New Documents</Divider>
              {renderUploadFields(totalExisting)}
            </>
          )
        ) : (
          /*
           * ADD MODE (or edit mode with zero existing docs):
           *   Show fields normally with a divider, no toggle needed.
           */
          <>
            <Divider orientation="center" style={{ borderColor: '#d9d9d9' }}>Add New Documents</Divider>
            {renderUploadFields(0)}
          </>
        )}

        {/* ── Action Buttons ── */}
        <div className="text-center mt-4" style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
          <Button size="large" onClick={() => setActiveTab("1")}>
            Previous
          </Button>
          <Button type="primary" size="large" onClick={handleSaveDocuments} loading={loader}>
            Done
          </Button>
        </div>
      </div>
    );
  };

  // ── Tab Items ─────────────────────────────────────────────────────────────
  const tabItems = [
    {
      key: "1",
      label: (
        <span>
          <BankOutlined />
          {" "}Branch Info
        </span>
      ),
      children: (
        <div className="add-branch-form-container" style={{ padding: '24px' }}>
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

          <div className="text-center mt-4" style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Button size="large" onClick={() => navigate('/branch/list')}>
              Cancel
            </Button>
            <Button type="primary" size="large" onClick={handleSaveBasicInfo} loading={loader}>
              {params.id ? 'Update & Next' : 'Save & Next'}
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: "2",
      label: (
        <span>
          <FileTextOutlined />
          {" "}Branch Documents
        </span>
      ),
      children: renderDocumentsTab(),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {loader && <Loader />}

      <div className="add-branch-page-content">
        <div className="add-branch-scroll-body" ref={scrollRef}>
          <Form form={form} layout="vertical" style={{ padding: 0 }}>
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              items={tabItems}
              size="large"
              type="card"
              className="custom-tabs"
              style={{ marginTop: 0, background: '#fff' }}
              renderTabBar={(props, DefaultTabBar) => (
                <div
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1000,
                    backgroundColor: "#fff",
                    boxShadow: isScrolled ? "0 2px 8px rgba(0,0,0,0.10)" : "none",
                    transition: "box-shadow 0.3s ease",
                  }}
                >
                  <div style={{ paddingBottom: "8px" }}>
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>
                      {params.id ? "Edit Branch" : "Add Branch"}
                    </h2>
                  </div>
                  <DefaultTabBar {...props} />
                </div>
              )}
            />
          </Form>
          <ToastContainer />
        </div>
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

      {/* ── Session Switch Modal ── */}
      <Modal
        open={sessionModalVisible}
        title={
          <div>
            <div style={{ textAlign: 'center', fontWeight: 600, fontSize: '16px', paddingBottom: '12px' }}>
              Switch Branch
            </div>
            <Divider style={{ margin: 0, borderColor: '#d9d9d9' }} />
          </div>
        }
        centered
        closable={false}
        maskClosable={false}
        width={440}
        footer={
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '8px' }}>
            <Button
              type="primary"
              size="large"
              onClick={handleSessionConfirm}
              loading={sessionUpdating}
              style={{ minWidth: '120px' }}
            >
              Yes
            </Button>
          </div>
        }
      >
        <p style={{ color: '#595959', fontSize: '15px', lineHeight: '1.6', textAlign: 'center', margin: '20px 0 12px' }}>
          Current session branch will be auto-changed to this newly created branch{' '}
          <strong>"{pendingBranchName}"</strong>.
        </p>
      </Modal>

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