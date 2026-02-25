import { useState, useEffect, useRef, useCallback } from "react";
import {
  notification, Form, Input, Button, Upload, message,
  Divider, Space, Modal, Spin, Tabs, DatePicker
} from "antd";
import {
  UploadOutlined, PlusOutlined, MinusOutlined,
  BankOutlined, FileTextOutlined, CameraOutlined, EyeOutlined,
  DeleteOutlined, FileOutlined, CloseCircleOutlined, UserOutlined,
  PhoneOutlined, HomeOutlined, EnvironmentOutlined, MailOutlined,
  GlobalOutlined, CalendarOutlined, ReloadOutlined,
} from "@ant-design/icons";
import { ToastContainer } from "react-toastify";
import Loader from "components/Common/Loader";
import { GET, DELETE, UPLOAD_CERTIFCATE, UPDATE_UPLOAD } from "helpers/api_helper";
import { useParams, useNavigate } from "react-router-dom";
import InputWithAddon from "components/Common/InputWithAddon";
import CameraCapture from "components/Common/CameraCapture";
import dayjs from "dayjs";
import "./AddOrganization.css";
import { GoogleMap, LoadScript, Marker, Circle } from "@react-google-maps/api";
import { LocationLoadingOverlay, LocationInfoBanner } from "components/Common/LocationComponent";

const ORGANIZATION_API = "/api/organization/";
const ORGANIZATION_DOCUMENTS_API = "/api/organization-documents/";
const mapContainerStyle = { width: "100%", height: "400px" };

const AddOrganization = () => {
  const [loader, setLoader] = useState(false);
  const [form] = Form.useForm();
  const params = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("1");
  const [orgId, setOrgId] = useState(null);
  const [isBasicInfoSaved, setIsBasicInfoSaved] = useState(false);
  const [existingDocs, setExistingDocs] = useState([]);
  const [newDocFields, setNewDocFields] = useState([{ id: Date.now(), file: null, loading: false }]);
  const [cameraVisible, setCameraVisible] = useState(false);
  const cameraFieldRef = useRef({ fieldId: null });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [formUpdateTrigger, setFormUpdateTrigger] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [partners, setPartners] = useState([{ id: 0, name: "", mobile: "" }]);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentAccuracy, setCurrentAccuracy] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationTimer, setLocationTimer] = useState(0);
  const [timeTaken, setTimeTaken] = useState(null);

  useEffect(() => {
    let interval;
    if (isGettingLocation) {
      interval = setInterval(() => setLocationTimer((p) => p + 1), 1000);
    } else {
      setLocationTimer(0);
    }
    return () => clearInterval(interval);
  }, [isGettingLocation]);

  // Window scroll tracking — same as AddBranch
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const parseLocation = (locationString) => {
    if (!locationString) return null;
    const [lat, lng] = locationString.split(",").map((c) => c.trim());
    if (lat && lng) return { lat: parseFloat(lat), lng: parseFloat(lng) };
    return null;
  };

  const fetchOrgDocuments = async (id) => {
    try {
      const response = await GET(`${ORGANIZATION_DOCUMENTS_API}?organization_id=${id}`);
      if (response?.status === 200) {
        const docs = response.data?.results || response.data || [];
        setExistingDocs(docs);
        setNewDocFields([{ id: Date.now(), file: null, loading: false }]);
        form.setFieldsValue({ new_org_documents: [{ document_type: "", document_description: "" }] });
      }
    } catch (error) {
      console.error("Failed to fetch organization documents:", error);
    }
  };

  const getOrgDetails = useCallback(async () => {
    setLoader(true);
    try {
      const response = await GET(`${ORGANIZATION_API}${params.id}/`);
      if (response?.status === 200) {
        const data = response.data;
        setOrgId(params.id);
        setIsBasicInfoSaved(true);

        let parsedPartners = [{ id: 0, name: "", mobile: "" }];
        if (data.partner_details) {
          try {
            const pd = typeof data.partner_details === "string" ? JSON.parse(data.partner_details) : data.partner_details;
            if (Array.isArray(pd) && pd.length > 0) {
              parsedPartners = pd.map((p, i) => ({ id: i, name: p.name || "", mobile: p.mobile || "" }));
            }
          } catch (_) {}
        }
        setPartners(parsedPartners);

        if (data.geo_location) {
          const coords = parseLocation(data.geo_location);
          if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
            setSelectedLocation({ lat: coords.lat.toFixed(6), lng: coords.lng.toFixed(6), address: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` });
            setMapCenter(coords);
          }
        }

        if (data.logo_url) setLogoPreview(data.logo_url);

        form.setFieldsValue({
          firm_name: data.firm_name, firm_address: data.firm_address,
          proprietor_name: data.proprietor_name, proprietor_mobilenumber: data.proprietor_mobilenumber,
          door_number: data.door_number, landmark: data.landmark, place: data.place,
          street_name: data.street_name, district: data.district, pincode: data.pincode,
          state: data.state, geo_location: data.geo_location, landline_number: data.landline_number,
          fax_number: data.fax_number, firm_email: data.firm_email, website: data.website,
          firm_established_date: data.firm_established_date ? dayjs(data.firm_established_date) : null,
          doj: data.doj ? dayjs(data.doj) : null,
        });

        await fetchOrgDocuments(params.id);
      }
    } catch (error) {
      notification.error({ message: "Error", description: "Failed to fetch organization details", duration: 5 });
    } finally {
      setLoader(false);
    }
  }, [params.id, form]);

  useEffect(() => {
    if (params?.id) {
      getOrgDetails();
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("tab") === "documents") {
        setActiveTab("2");
        window.history.replaceState(null, "", window.location.pathname);
      }
    } else {
      setNewDocFields([{ id: Date.now(), file: null, loading: false }]);
      setExistingDocs([]);
      setIsBasicInfoSaved(false);
      setOrgId(null);
      setPartners([{ id: 0, name: "", mobile: "" }]);
      setLogoFile(null);
      setLogoPreview(null);
    }
  }, [params?.id]);

  const alphaStartFilter = (value) => {
    if (value.length === 0) return "";
    let filtered = "";
    for (let i = 0; i < value.length; i++) {
      if (i === 0) { if (/[A-Za-z]/.test(value[i])) filtered += value[i]; }
      else { if (/[A-Za-z0-9\s\-,./]/.test(value[i])) filtered += value[i]; }
    }
    return filtered;
  };
  const numericFilter = (value) => value.replace(/\D/g, "");
  const addPartner = () => setPartners((prev) => [...prev, { id: Date.now(), name: "", mobile: "" }]);
  const removePartner = (id) => setPartners((prev) => prev.filter((p) => p.id !== id));
  const updatePartner = (id, field, value) => setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const handleLogoSelect = (file) => {
    const original = file.originFileObj || file;
    if (!original.type.startsWith("image/")) { message.error("Please select an image file"); return false; }
    if (original.size > 2 * 1024 * 1024) { message.error("Logo image must be smaller than 2MB"); return false; }
    if (logoPreview && logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoFile(original);
    setLogoPreview(URL.createObjectURL(original));
    return false;
  };

  const handleLogoClear = () => {
    if (logoPreview && logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoFile(null); setLogoPreview(null);
  };

  const openMapModal = () => {
    if (selectedLocation) {
      const lat = parseFloat(selectedLocation.lat); const lng = parseFloat(selectedLocation.lng);
      if (!isNaN(lat) && !isNaN(lng)) setMapCenter({ lat, lng });
    } else { setMapCenter({ lat: 20.5937, lng: 78.9629 }); }
    setMapModalVisible(true);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) { notification.error({ message: "Geolocation Not Supported", description: "Your browser does not support geolocation." }); return; }
    setIsGettingLocation(true); setLocationTimer(0); setTimeTaken(null); setCurrentAccuracy(null);
    notification.info({ message: "Getting Location", description: "Please allow location access and wait...", duration: 4 });
    const startTime = Date.now();
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (accuracy <= 2) {
          const lat = latitude.toFixed(6); const lng = longitude.toFixed(6);
          const timeElapsed = Math.round((Date.now() - startTime) / 1000);
          setSelectedLocation({ lat, lng, address: `${lat}, ${lng}` });
          setMapCenter({ lat: latitude, lng: longitude }); setCurrentAccuracy(accuracy); setTimeTaken(timeElapsed); setIsGettingLocation(false);
          notification.success({ message: "High Accuracy Location Locked", description: `Accuracy: ${accuracy.toFixed(1)}m | Time: ${timeElapsed}s`, duration: 5 });
          navigator.geolocation.clearWatch(watchId);
        } else {
          setSelectedLocation({ lat: latitude.toFixed(6), lng: longitude.toFixed(6), address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` });
          setMapCenter({ lat: latitude, lng: longitude }); setCurrentAccuracy(accuracy);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = "Unable to get location";
        if (error.code === 1) errorMessage = "Location permission denied";
        if (error.code === 2) errorMessage = "Location unavailable";
        if (error.code === 3) errorMessage = "Location request timeout";
        notification.error({ message: "GPS Error", description: errorMessage });
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const handleMapClick = (e) => {
    const lat = e.latLng.lat(); const lng = e.latLng.lng();
    setSelectedLocation({ lat: lat.toFixed(6), lng: lng.toFixed(6), address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
    setMapCenter({ lat, lng });
  };

  const handleMapModalOk = () => {
    if (selectedLocation) {
      form.setFieldsValue({ geo_location: `${selectedLocation.lat},${selectedLocation.lng}` });
      setMapModalVisible(false);
      notification.success({ message: "Location Set", description: `Coordinates: ${selectedLocation.lat}, ${selectedLocation.lng}`, duration: 2 });
    } else {
      notification.error({ message: "No Location Selected", description: "Please select a location on the map or use current location", duration: 5 });
    }
  };

  const openCamera = (fieldId) => { cameraFieldRef.current = { fieldId }; setCameraVisible(true); };

  const handleCameraCapture = (file) => {
    const { fieldId } = cameraFieldRef.current;
    if (!file || !file.name) { message.error("Invalid file received from camera"); return; }
    setNewDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, file } : f)));
    message.success(`${file.name} selected successfully`);
    setFormUpdateTrigger((t) => t + 1);
    cameraFieldRef.current = { fieldId: null };
  };

  const handleFileSelect = (file, fieldId) => {
    const original = file.originFileObj || file;
    setNewDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, file: original } : f)));
    message.success(`${original.name} selected successfully`);
    setFormUpdateTrigger((t) => t + 1);
    return false;
  };

  const handleClearFile = (fieldId) => {
    setNewDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, file: null } : f)));
    message.info("File selection cleared.");
    setFormUpdateTrigger((t) => t + 1);
  };

  const uploadDocument = async (fieldId, index, currentOrgId) => {
    const fieldObj = newDocFields.find((f) => f.id === fieldId);
    const file = fieldObj?.file;
    if (!file) return true;
    const docType = form.getFieldValue(["new_org_documents", index, "document_type"]);
    const docDescription = form.getFieldValue(["new_org_documents", index, "document_description"]);
    if (!docType || docType.trim() === "") {
      form.setFields([{ name: ["new_org_documents", index, "document_type"], errors: ["Please enter document type"] }]);
      return false;
    }
    if (!docDescription || docDescription.trim() === "") {
      form.setFields([{ name: ["new_org_documents", index, "document_description"], errors: ["Please enter description"] }]);
      return false;
    }
    if (!(file instanceof File)) {
      notification.error({ message: "Error", description: "Invalid file object. Please select the file again.", duration: 5 });
      return false;
    }
    setNewDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, loading: true } : f)));
    const formData = new FormData();
    formData.append("document_file", file, file.name);
    formData.append("document_type", docType);
    formData.append("document_description", docDescription);
    try {
      const response = await UPLOAD_CERTIFCATE(`${ORGANIZATION_DOCUMENTS_API}?organization_id=${currentOrgId}`, formData);
      setNewDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, loading: false, file: null } : f)));
      if (response.status === 200 || response.status === 201) {
        form.setFieldValue(["new_org_documents", index, "document_type"], "");
        form.setFieldValue(["new_org_documents", index, "document_description"], "");
        return true;
      } else { throw new Error(response.statusText || "Upload failed"); }
    } catch (error) {
      setNewDocFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, loading: false } : f)));
      notification.error({ message: "Upload Failed", description: error.message || "Failed to upload document.", duration: 5 });
      return false;
    }
  };

  const handleSaveBasicInfo = async () => {
    try {
      await form.validateFields(["firm_name", "firm_address", "proprietor_name", "proprietor_mobilenumber", "door_number", "place", "street_name", "district", "pincode", "state"]);
    } catch {
      notification.error({ message: "Validation Error", description: "Please fill in all required fields.", duration: 5 });
      return;
    }
    const values = form.getFieldsValue();
    setLoader(true);
    try {
      const partnerDetails = partners.filter((p) => p.name.trim() !== "" || p.mobile.trim() !== "").map((p) => ({ name: p.name, mobile: p.mobile }));
      let geoLocationValue = values.geo_location;
      if (selectedLocation) geoLocationValue = `${selectedLocation.lat},${selectedLocation.lng}`;
      const payload = new FormData();
      payload.append("firm_name", values.firm_name || "");
      payload.append("firm_address", values.firm_address || "");
      payload.append("proprietor_name", values.proprietor_name || "");
      payload.append("proprietor_mobilenumber", values.proprietor_mobilenumber || "");
      payload.append("door_number", values.door_number || "");
      payload.append("landmark", values.landmark || "");
      payload.append("place", values.place || "");
      payload.append("street_name", values.street_name || "");
      payload.append("district", values.district || "");
      payload.append("pincode", values.pincode || "");
      payload.append("state", values.state || "");
      payload.append("geo_location", geoLocationValue || "");
      payload.append("landline_number", values.landline_number || "");
      payload.append("fax_number", values.fax_number || "");
      if (values.firm_email && values.firm_email.trim()) { payload.append("firm_email", values.firm_email.trim()); } else { payload.append("firm_email", ""); }
      if (values.website && values.website.trim()) payload.append("website", values.website.trim());
      if (values.firm_established_date) payload.append("firm_established_date", values.firm_established_date.format("YYYY-MM-DD"));
      if (values.doj) payload.append("doj", values.doj.format("YYYY-MM-DD"));
      payload.append("partner_details", partnerDetails.length > 0 ? JSON.stringify(partnerDetails) : "[]");
      if (logoFile instanceof File) payload.append("logo_file", logoFile, logoFile.name);

      let response;
      if (params.id) { response = await UPDATE_UPLOAD(`${ORGANIZATION_API}${params.id}/`, payload); }
      else { response = await UPLOAD_CERTIFCATE(ORGANIZATION_API, payload); }

      if (response?.status === 200 || response?.status === 201) {
        if (params.id) {
          notification.success({ message: "Organization Updated", description: "Basic info updated successfully.", duration: 5 });
          setActiveTab("2");
          await fetchOrgDocuments(params.id);
        } else {
          const newOrgId = response.data?.id;
          setOrgId(newOrgId); setIsBasicInfoSaved(true);
          notification.success({ message: "Organization Created", description: "Organization created successfully.", duration: 5 });
          setTimeout(() => { window.location.href = `/organization/edit/${newOrgId}?tab=documents`; }, 1000);
        }
      } else if (response?.status === 400) {
        const errorMessages = [];
        if (response?.data) Object.keys(response.data).forEach((key) => { errorMessages.push(Array.isArray(response.data[key]) ? response.data[key][0] : response.data[key]); });
        notification.error({ message: "Error", description: errorMessages.join("\n") || "Failed to save organization.", duration: 5 });
      }
    } catch (error) {
      notification.error({ message: "Error", description: error?.response?.data?.detail || error.message || "An error occurred.", duration: 5 });
    } finally { setLoader(false); }
  };

  const handleSaveDocuments = async () => {
    const currentOrgId = orgId || params.id;
    if (!currentOrgId) { notification.error({ message: "Error", description: "Please save organization info first.", duration: 5 }); return; }
    const fieldsWithFiles = newDocFields.filter((f) => f.file !== null);
    if (fieldsWithFiles.length === 0) { navigate("/organization/list"); return; }
    setLoader(true);
    let allUploadsSuccessful = true;
    for (const field of fieldsWithFiles) {
      const index = newDocFields.findIndex((f) => f.id === field.id);
      const success = await uploadDocument(field.id, index, currentOrgId);
      if (!success) allUploadsSuccessful = false;
    }
    setLoader(false);
    if (allUploadsSuccessful) {
      notification.success({ message: "Documents Uploaded", description: "All documents uploaded successfully.", duration: 5 });
      await fetchOrgDocuments(currentOrgId);
    }
  };

  const handleDeleteDocument = (docId, fileName) => {
    Modal.confirm({
      title: "Confirm Delete", content: `Are you sure you want to delete: ${fileName || "Document"}?`, okText: "Delete", okType: "danger",
      onOk: async () => {
        try {
          const currentOrgId = orgId || params.id;
          const deleteResponse = await DELETE(`${ORGANIZATION_DOCUMENTS_API}${docId}/?organization_id=${currentOrgId}`);
          if (deleteResponse.status !== 200 && deleteResponse.status !== 204) { notification.error({ message: "Error", description: "Failed to delete document.", duration: 5 }); return; }
          setExistingDocs((prev) => prev.filter((d) => d.id !== docId));
          notification.success({ message: "Deleted", description: `${fileName || "Document"} deleted successfully.`, duration: 5 });
        } catch (error) { notification.error({ message: "Error", description: error.message || "Deletion failed.", duration: 5 }); }
      },
    });
  };

  const addNewDocField = () => {
    const newId = Date.now();
    setNewDocFields((prev) => [...prev, { id: newId, file: null, loading: false }]);
    const current = form.getFieldValue("new_org_documents") || [];
    form.setFieldsValue({ new_org_documents: [...current, { document_type: "", document_description: "" }] });
  };

  const removeNewDocField = (fieldId, index) => {
    setNewDocFields((prev) => prev.filter((f) => f.id !== fieldId));
    const current = form.getFieldValue("new_org_documents") || [];
    current.splice(index, 1);
    form.setFieldsValue({ new_org_documents: [...current] });
  };

  const handleTabChange = (key) => {
    if (key === "2" && !isBasicInfoSaved && !params.id) {
      notification.warning({ message: "Save Organization Info First", description: "Please save the organization information before uploading documents.", duration: 5 });
      return;
    }
    setActiveTab(key);
  };

  const SecurePDFPreview = ({ url }) => {
    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <Button type="primary" size="small" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>Open PDF in New Tab</Button>
        </div>
        <iframe src={googleViewerUrl} title="PDF Preview" width="100%" height="600px" style={{ border: "1px solid #d9d9d9", borderRadius: 4, display: "block" }} />
      </div>
    );
  };

  const viewDocument = (documentUrl, fileName) => {
    if (!documentUrl || typeof documentUrl !== "string") { notification.error({ message: "Error", description: "Document URL not found or invalid", duration: 5 }); return; }
    let fileExtension = "";
    if (fileName) { fileExtension = fileName.split(".").pop().toLowerCase(); } else { fileExtension = documentUrl.split("?")[0].split(".").pop().toLowerCase(); }
    if (fileExtension === "pdf") { setPreviewType("pdf"); setPreviewContent(documentUrl); setPreviewVisible(true); return; }
    if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(fileExtension)) { setPreviewType("image"); setPreviewContent(documentUrl); setPreviewVisible(true); setPreviewLoading(true); return; }
    window.open(documentUrl, "_blank");
  };

  const renderDocumentsTab = () => {
    const totalExisting = existingDocs.length;
    return (
      <div className="add-org-form-container" >
        {existingDocs.map((doc, idx) => {
          const displayName = doc.document_file?.original_name || "Document";
          const truncatedName = displayName.length > 20 ? displayName.slice(0, 20) + "..." : displayName;
          return (
            <div key={doc.id} className="mb-3">
              <Divider orientation="center" style={{ borderTopWidth: "2px", borderColor: "#d9d9d9" }}>{`Document ${idx + 1}`}</Divider>
              <div className="row">
                <div className="col-md-4">
                  <Form.Item label="Uploaded File" style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 11px", border: "1px solid #d9d9d9", borderRadius: "6px", backgroundColor: "#f0f5ff" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                        <FileOutlined style={{ color: "#1890ff", fontSize: "16px", flexShrink: 0 }} />
                        <span style={{ fontSize: "13px", color: "#1890ff", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={displayName}>{truncatedName}</span>
                      </div>
                      <Space size={4}>
                        <Button type="link" icon={<EyeOutlined />} size="small" style={{ padding: "0 4px" }} onClick={() => viewDocument(doc.signed_url, doc.document_file?.original_name)} />
                        <Button type="link" danger icon={<DeleteOutlined />} size="small" style={{ padding: "0 4px" }} onClick={() => handleDeleteDocument(doc.id, doc.document_file?.original_name)} />
                      </Space>
                    </div>
                  </Form.Item>
                </div>
                <div className="col-md-4">
                  <Form.Item label="Document Type" style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 11px", border: "1px solid #d9d9d9", borderRadius: "6px", backgroundColor: "#fafafa", minHeight: "36px" }}>
                      <FileTextOutlined style={{ color: "#8c8c8c" }} />
                      <span style={{ fontSize: "13px", color: "#333" }}>{doc.document_type || "—"}</span>
                    </div>
                  </Form.Item>
                </div>
                <div className="col-md-4">
                  <Form.Item label="Description" style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 11px", border: "1px solid #d9d9d9", borderRadius: "6px", backgroundColor: "#fafafa", minHeight: "36px" }}>
                      <FileTextOutlined style={{ color: "#8c8c8c" }} />
                      <span style={{ fontSize: "13px", color: "#333" }}>{doc.document_description || "—"}</span>
                    </div>
                  </Form.Item>
                </div>
              </div>
            </div>
          );
        })}

        <Divider orientation="center" style={{ borderColor: "#d9d9d9" }}>Add New Documents</Divider>

        {newDocFields.map((field, index) => {
          const globalDocNumber = totalExisting + index + 1;
          return (
            <div key={field.id} className="mb-3">
              {newDocFields.length > 1 && (
                <Divider orientation="center" style={{ borderTopWidth: "2px", borderColor: "#d9d9d9" }}>{`Document ${globalDocNumber}`}</Divider>
              )}
              <div className="row">
                <div className="col-md-4">
                  <Form.Item label="File Upload" style={{ marginBottom: "8px" }}>
                    <Space.Compact style={{ width: "100%", marginBottom: field.file ? "8px" : "0" }}>
                      <Upload maxCount={1} multiple={false} beforeUpload={(file) => handleFileSelect(file, field.id)} accept=".pdf,.csv,.png,.jpeg,.jpg,.doc,.docx" showUploadList={false} fileList={[]}>
                        <Button icon={<UploadOutlined />} style={{ width: "100%", textAlign: "left", paddingLeft: "12px" }}>Browse</Button>
                      </Upload>
                      <Button icon={<CameraOutlined />} onClick={() => openCamera(field.id)} title="Capture with Camera">Camera</Button>
                    </Space.Compact>
                    {field.file && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 11px", border: "1px solid #d9d9d9", borderRadius: "6px", backgroundColor: "#f6ffed" }}>
                        <div style={{ fontSize: "13px", color: "#52c41a", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "calc(100% - 30px)" }} title={field.file.name}>
                          <FileOutlined style={{ marginRight: "5px" }} />
                          {field.file.name.length > 25 ? field.file.name.substring(0, 25) + "..." : field.file.name}
                        </div>
                        <Button icon={<CloseCircleOutlined />} onClick={() => handleClearFile(field.id)} danger type="text" size="small" style={{ padding: "0", height: "auto", marginLeft: "8px" }} />
                      </div>
                    )}
                  </Form.Item>
                </div>
                <div className="col-md-4">
                  <Form.Item label="Document Type" name={["new_org_documents", index, "document_type"]} style={{ marginBottom: "8px" }}
                    rules={[{ validator: (_, value) => { if (field.file && (!value || value.trim() === "")) return Promise.reject("Please enter document type"); return Promise.resolve(); } }]}>
                    <InputWithAddon icon={<FileTextOutlined />} placeholder="Enter document type" onChange={() => setFormUpdateTrigger((t) => t + 1)} />
                  </Form.Item>
                </div>
                <div className="col-md-4">
                  <Form.Item label="Description" name={["new_org_documents", index, "document_description"]} style={{ marginBottom: "8px" }}
                    rules={[{ validator: (_, value) => { if (field.file && (!value || value.trim() === "")) return Promise.reject("Enter description to upload"); return Promise.resolve(); } }]}>
                    <InputWithAddon icon={<FileTextOutlined />} placeholder="Enter description" onChange={() => setFormUpdateTrigger((t) => t + 1)} />
                  </Form.Item>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                {index === newDocFields.length - 1 && (
                  <Button type="primary" shape="circle" icon={<PlusOutlined />} onClick={addNewDocField} style={{ width: 35, height: 35, backgroundColor: "#28a745", borderColor: "#28a745", color: "#fff" }} />
                )}
                {newDocFields.length > 1 && (
                  <Button type="primary" danger shape="circle" icon={<MinusOutlined />} onClick={() => removeNewDocField(field.id, index)} style={{ width: 35, height: 35, backgroundColor: "red", borderColor: "red" }} />
                )}
              </div>
            </div>
          );
        })}

        <div className="text-center mt-4" style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "20px" }}>
          <Button size="large" onClick={() => setActiveTab("1")}>Previous</Button>
          <Button type="primary" size="large" onClick={handleSaveDocuments} loading={loader}>Update</Button>
        </div>
      </div>
    );
  };

  const tabItems = [
    {
      key: "1",
      label: (<span><BankOutlined /> Organization Info</span>),
      children: (
        <div className="add-org-form-container">
          <div className="row mb-2">
            <div className="col-md-6">
              <Form.Item label="Firm Name" name="firm_name" rules={[{ required: true, message: "Please enter firm name" }, { pattern: /^[A-Za-z][A-Za-z0-9\s\-,.]*$/, message: "Must start with an alphabet" }]}>
                <InputWithAddon icon={<BankOutlined />} placeholder="Enter firm name" onValueFilter={alphaStartFilter} />
              </Form.Item>
            </div>
            <div className="col-md-6">
              <Form.Item label="Firm Address" name="firm_address" rules={[{ required: true, message: "Please enter firm address" }]}>
                <Input.TextArea placeholder="Enter firm address" allowClear autoSize={{ minRows: 2, maxRows: 5 }} />
              </Form.Item>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-md-6">
              <Form.Item label="Proprietor Name" name="proprietor_name" rules={[{ required: true, message: "Please enter proprietor name" }, { pattern: /^[A-Za-z][A-Za-z\s]*$/, message: "Must start with an alphabet, letters only" }]}>
                <InputWithAddon icon={<UserOutlined />} placeholder="Enter proprietor name"
                  onValueFilter={(value) => { if (!value.length) return ""; let f = ""; for (let i = 0; i < value.length; i++) { if (i === 0) { if (/[A-Za-z]/.test(value[i])) f += value[i]; } else { if (/[A-Za-z\s]/.test(value[i])) f += value[i]; } } return f; }} />
              </Form.Item>
            </div>
            <div className="col-md-6">
              <Form.Item label="Proprietor Mobile Number" name="proprietor_mobilenumber" rules={[{ required: true, message: "Please enter mobile number" }, { pattern: /^[6-9]\d{9}$/, message: "Enter a valid 10-digit mobile number" }]}>
                <InputWithAddon icon={<PhoneOutlined />} placeholder="Enter mobile number" maxLength={10} onValueFilter={numericFilter} />
              </Form.Item>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-md-6">
              <Form.Item label="Door Number" name="door_number" rules={[{ required: true, message: "Please enter door number" }]}>
                <InputWithAddon icon={<HomeOutlined />} placeholder="Enter door number" />
              </Form.Item>
            </div>
            <div className="col-md-6">
              <Form.Item label="Landmark" name="landmark">
                <InputWithAddon icon={<EnvironmentOutlined />} placeholder="Enter landmark" />
              </Form.Item>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-md-6">
              <Form.Item label="Street Name" name="street_name" rules={[{ required: true, message: "Please enter street name" }]}>
                <InputWithAddon icon={<EnvironmentOutlined />} placeholder="Enter street name" />
              </Form.Item>
            </div>
            <div className="col-md-6">
              <Form.Item label="Place" name="place" rules={[{ required: true, message: "Please enter place" }]}>
                <InputWithAddon icon={<EnvironmentOutlined />} placeholder="Enter place"
                  onValueFilter={(value) => { if (!value.length) return ""; let f = ""; for (let i = 0; i < value.length; i++) { if (i === 0) { if (/[A-Za-z]/.test(value[i])) f += value[i]; } else { if (/[A-Za-z\s]/.test(value[i])) f += value[i]; } } return f; }} />
              </Form.Item>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-md-6">
              <Form.Item label="District" name="district" rules={[{ required: true, message: "Please enter district" }]}>
                <InputWithAddon icon={<EnvironmentOutlined />} placeholder="Enter district"
                  onValueFilter={(value) => { if (!value.length) return ""; let f = ""; for (let i = 0; i < value.length; i++) { if (i === 0) { if (/[A-Za-z]/.test(value[i])) f += value[i]; } else { if (/[A-Za-z\s]/.test(value[i])) f += value[i]; } } return f; }} />
              </Form.Item>
            </div>
            <div className="col-md-6">
              <Form.Item label="Pincode" name="pincode" rules={[{ required: true, message: "Please enter pincode" }, { pattern: /^\d{6}$/, message: "Enter a valid 6-digit pincode" }]}>
                <InputWithAddon icon={<EnvironmentOutlined />} placeholder="Enter pincode" maxLength={6} onValueFilter={numericFilter} />
              </Form.Item>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-md-6">
              <Form.Item label="State" name="state" rules={[{ required: true, message: "Please enter state" }]}>
                <InputWithAddon icon={<EnvironmentOutlined />} placeholder="Enter state" />
              </Form.Item>
            </div>
            <div className="col-md-6">
              <Form.Item label="Geo Location" name="geo_location">
                <InputWithAddon icon={<EnvironmentOutlined />} placeholder="Click the map icon to select location" readOnly
                  addonAfter={<Button type="text" icon={<EnvironmentOutlined style={{ color: "#1890ff", fontSize: 16 }} />} onClick={openMapModal} title="Select Location on Map" style={{ display: "flex", alignItems: "center", justifyContent: "center" }} />} />
              </Form.Item>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-md-6">
              <Form.Item label="Landline Number" name="landline_number">
                <InputWithAddon icon={<PhoneOutlined />} placeholder="e.g. 0422-123456" />
              </Form.Item>
            </div>
            <div className="col-md-6">
              <Form.Item label="Fax Number" name="fax_number">
                <InputWithAddon icon={<PhoneOutlined />} placeholder="e.g. 0422-654321" />
              </Form.Item>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-md-6">
              <Form.Item label="Firm Email" name="firm_email" rules={[{ type: "email", message: "Enter a valid email address" }]}>
                <InputWithAddon icon={<MailOutlined />} placeholder="Enter firm email" />
              </Form.Item>
            </div>
            <div className="col-md-6">
              <Form.Item label="Website" name="website">
                <InputWithAddon icon={<GlobalOutlined />} placeholder="e.g. https://example.com" />
              </Form.Item>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-md-6">
              <Form.Item label="Firm Established Date" name="firm_established_date">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" suffixIcon={<CalendarOutlined />} placeholder="Select established date" />
              </Form.Item>
            </div>
            <div className="col-md-6">
              <Form.Item label="Date of Joining (DOJ)" name="doj">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" suffixIcon={<CalendarOutlined />} placeholder="Select DOJ" />
              </Form.Item>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-md-6">
              <Form.Item label="Firm Logo">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: 90, height: 90, borderRadius: 8, border: "1px dashed #d9d9d9", backgroundColor: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {logoPreview ? (<img src={logoPreview} alt="Firm Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />) : (
                      <div style={{ textAlign: "center", color: "#bbb", fontSize: 11 }}><BankOutlined style={{ fontSize: 24, marginBottom: 4 }} /><div>No Logo</div></div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Upload maxCount={1} multiple={false} accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" showUploadList={false} beforeUpload={handleLogoSelect} fileList={[]}>
                      <Button icon={<UploadOutlined />} size="small">{logoPreview ? "Change Logo" : "Browse Logo"}</Button>
                    </Upload>
                    {logoPreview && (<Button icon={<CloseCircleOutlined />} size="small" danger onClick={handleLogoClear}>Remove</Button>)}
                    <div style={{ fontSize: 11, color: "#999", lineHeight: 1.4 }}>PNG, JPG, WEBP<br />Max 2MB</div>
                  </div>
                </div>
              </Form.Item>
            </div>
          </div>
          <Divider orientation="center" style={{ borderColor: "#d9d9d9" }}>Partner Details</Divider>
          {partners.map((partner, index) => (
            <div key={partner.id} className="mb-3">
              <div className="row">
                <div className="col-md-6">
                  <Form.Item label={`Partner ${index + 1} Name`} style={{ marginBottom: "8px" }}>
                    <InputWithAddon icon={<UserOutlined />} placeholder="Partner name" value={partner.name} onChange={(e) => updatePartner(partner.id, "name", e.target.value)} />
                  </Form.Item>
                </div>
                <div className="col-md-6">
                  <Form.Item label="Mobile" style={{ marginBottom: "8px" }}>
                    <InputWithAddon icon={<PhoneOutlined />} placeholder="Mobile number" maxLength={10} value={partner.mobile} onChange={(e) => updatePartner(partner.id, "mobile", numericFilter(e.target.value))} />
                  </Form.Item>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                {index === partners.length - 1 && (
                  <Button type="primary" shape="circle" icon={<PlusOutlined />} onClick={addPartner}
                    style={{ width: 35, height: 35, backgroundColor: "#28a745", borderColor: "#28a745", color: "#fff" }} />
                )}
                {partners.length > 1 && (
                  <Button type="primary" danger shape="circle" icon={<MinusOutlined />} onClick={() => removePartner(partner.id)}
                    style={{ width: 35, height: 35, backgroundColor: "red", borderColor: "red" }} />
                )}
              </div>
            </div>
          ))}
          <div className="text-center mt-4" style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            <Button size="large" onClick={() => navigate("/organization/list")}>Cancel</Button>
            <Button type="primary" size="large" onClick={handleSaveBasicInfo} loading={loader}>{params.id ? "Update & Next" : "Save & Next"}</Button>
          </div>
        </div>
      ),
    },
    {
      key: "2",
      label: (<span><FileTextOutlined /> Documents</span>),
      children: renderDocumentsTab(),
    },
  ];

  return (
    <>
      {loader && <Loader />}
      <LocationLoadingOverlay visible={isGettingLocation} timer={locationTimer} />

      <div style={{ margin: 0, padding: 0, width: "100%" }}>

        {/* ── Sticky Header — title only, no tab pills ── */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1000,
            backgroundColor: "#fff",
            display: "flex",
            alignItems: "center",
            padding: "8px 16px",
            boxShadow: isScrolled ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
            transition: "box-shadow 0.3s ease",
            minHeight: "48px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600", whiteSpace: "nowrap" }}>
            {params.id ? "Edit Organization" : "Add Organization"}
          </h2>
        </div>

        {/* ── Tabs + Form ── */}
        <Form form={form} layout="vertical" style={{ padding: 0 }}>
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={tabItems}
            size="large"
            type="card"
            className="custom-tabs"
            style={{ marginTop: 8, background: "#fff" }}
          />
        </Form>

        <ToastContainer />
      </div>

      <CameraCapture
        visible={cameraVisible}
        onClose={() => { setCameraVisible(false); cameraFieldRef.current = { fieldId: null }; }}
        onCapture={handleCameraCapture}
      />

      <Modal
        title={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><EnvironmentOutlined style={{ color: "#1890ff" }} /><span>Select Organization Location</span></div>}
        open={mapModalVisible} onCancel={() => setMapModalVisible(false)} width={900}
        footer={
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              {selectedLocation && (<Button icon={<ReloadOutlined />} onClick={() => { setSelectedLocation(null); setCurrentAccuracy(null); setTimeTaken(null); form.setFieldsValue({ geo_location: "" }); }} />)}
              <Button type="default" icon={<EnvironmentOutlined />} onClick={handleGetCurrentLocation} disabled={isGettingLocation}>Use Current Location</Button>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <Button onClick={() => setMapModalVisible(false)}>Cancel</Button>
              <Button type="primary" onClick={handleMapModalOk} disabled={!selectedLocation}>Confirm Location</Button>
            </div>
          </div>
        }
        destroyOnClose
      >
        <LocationInfoBanner selectedLocation={selectedLocation} currentAccuracy={currentAccuracy} timeTaken={timeTaken} isGettingLocation={isGettingLocation} />
        <LoadScript googleMapsApiKey="AIzaSyBqZO5W2UKl7m5gPxh0_KIjaRckuJ7VUsE">
          <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={15} onClick={handleMapClick}
            options={{ zoomControl: true, streetViewControl: false, mapTypeControl: true, fullscreenControl: true, gestureHandling: isGettingLocation ? "none" : "greedy" }}>
            {selectedLocation && (<Marker position={{ lat: parseFloat(selectedLocation.lat), lng: parseFloat(selectedLocation.lng) }} animation={window.google?.maps?.Animation?.DROP} />)}
            {selectedLocation && currentAccuracy && (<Circle center={{ lat: parseFloat(selectedLocation.lat), lng: parseFloat(selectedLocation.lng) }} radius={currentAccuracy} options={{ fillOpacity: 0.15, strokeOpacity: 0.4 }} />)}
          </GoogleMap>
        </LoadScript>
      </Modal>

      <Modal open={previewVisible} title="Document Preview"
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>Close</Button>,
          <Button key="open" type="primary" onClick={() => window.open(previewContent, "_blank")}>Open in New Tab</Button>,
        ]}
        onCancel={() => setPreviewVisible(false)} width={900} centered destroyOnClose
        bodyStyle={{ padding: "16px", margin: 0 }} style={{ top: 20 }}>
        <Spin spinning={previewLoading && previewType === "image"}>
          {previewType === "pdf" && previewContent && <SecurePDFPreview url={previewContent} />}
          {previewType === "image" && previewContent && (
            <div style={{ textAlign: "center" }}>
              <img src={previewContent} alt="Document Preview" style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }}
                onLoad={() => setPreviewLoading(false)}
                onError={() => { setPreviewLoading(false); notification.error({ message: "Error", description: "Failed to load image", duration: 5 }); }} />
            </div>
          )}
        </Spin>
      </Modal>
    </>
  );
};

export default AddOrganization;