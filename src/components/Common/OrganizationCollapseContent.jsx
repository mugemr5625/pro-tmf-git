import React, { useState, useEffect } from "react";
import { Descriptions, Modal, Button, Alert, Spin, Tag } from "antd";
import { PhoneOutlined, MailOutlined, GlobalOutlined } from "@ant-design/icons";
import LocationMapModal from "./LocationMapModal";
import location2    from "../../assets/icons/location (1).png";
import pdfIcon      from "../../assets/icons/pdf.png";
import imageIcon    from "../../assets/icons/image.png";
import excelIcon    from "../../assets/icons/excel.png";
import wordIcon     from "../../assets/icons/word.png";
import defaultIcon  from "../../assets/icons/default.png";

// ========== SECURITY CONFIGURATION ==========
const ALLOWED_DOMAINS = [
  'storage.googleapis.com',
  'storage.cloud.google.com',
];
const BLOCKED_EXTENSIONS = ['svg', 'xml', 'html', 'htm', 'js', 'exe', 'bat', 'sh', 'scr', 'vbs'];

// ========== SECURITY UTILITIES ==========
const isUrlSafe = (url) => {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'https:') return { safe: false, reason: 'Only HTTPS URLs are allowed' };

    const isAllowed = ALLOWED_DOMAINS.some(domain =>
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
    if (!isAllowed) return { safe: false, reason: 'URL not from trusted domain' };

    if (urlObj.hostname.includes('googleapis.com')) {
      const isV4 =
        urlObj.searchParams.has('X-Goog-Algorithm') &&
        urlObj.searchParams.has('X-Goog-Credential') &&
        urlObj.searchParams.has('X-Goog-Signature') &&
        urlObj.searchParams.has('X-Goog-Date') &&
        urlObj.searchParams.has('X-Goog-Expires');
      const isV2 =
        urlObj.searchParams.has('Expires') &&
        urlObj.searchParams.has('GoogleAccessId') &&
        urlObj.searchParams.has('Signature');

      if (!isV4 && !isV2) return { safe: false, reason: 'Invalid signed URL format' };

      if (isV4) {
        const googleDate     = urlObj.searchParams.get('X-Goog-Date');
        const expiresSeconds = parseInt(urlObj.searchParams.get('X-Goog-Expires'));
        if (googleDate && !isNaN(expiresSeconds)) {
          const year = parseInt(googleDate.slice(0, 4)), month = parseInt(googleDate.slice(4, 6)) - 1,
                day  = parseInt(googleDate.slice(6, 8)), hour  = parseInt(googleDate.slice(9, 11)),
                min  = parseInt(googleDate.slice(11, 13)), sec  = parseInt(googleDate.slice(13, 15));
          const expiresAt = Date.UTC(year, month, day, hour, min, sec) + expiresSeconds * 1000;
          if (Date.now() > expiresAt) return { safe: false, reason: 'Signed URL has expired' };
        }
      }
      if (isV2) {
        const expires = parseInt(urlObj.searchParams.get('Expires'));
        if (expires < Math.floor(Date.now() / 1000)) return { safe: false, reason: 'Signed URL has expired' };
      }
    }
    return { safe: true };
  } catch (e) {
    return { safe: false, reason: 'Invalid URL format' };
  }
};

const getFileTypeFromUrl = (url) => {
  if (!url) return "unknown";
  const cleanUrl  = url.split("?")[0].toLowerCase();
  const parts     = cleanUrl.split('/');
  const filename  = parts[parts.length - 1];
  const extension = filename.split('.').pop();
  if (BLOCKED_EXTENSIONS.includes(extension)) return "blocked";
  if (extension === 'pdf') return "pdf";
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) return "image";
  if (['xls', 'xlsx', 'csv'].includes(extension)) return "excel";
  if (['doc', 'docx'].includes(extension)) return "word";
  if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) return "video";
  return "unknown";
};

const verifyContentType = async (url) => {
  try {
    const extension = getFileTypeFromUrl(url);
    if (extension === "blocked") return { safe: false, reason: 'Blocked file type for security' };
    return { safe: true, type: extension, skipVerification: true };
  } catch (error) {
    return { safe: true, type: 'unknown', warning: 'Could not verify file type' };
  }
};

// ========== DESCRIPTION CAPTION ==========
const DescriptionCaption = ({ text }) =>
  text ? (
    <div style={{
      textAlign: "center", marginTop: 10, fontSize: 14,
      color: "#555", fontStyle: "italic",
    }}>
      {text}
    </div>
  ) : null;

// ========== SECURE PREVIEW COMPONENTS ==========
const SecureImagePreview = ({ url, description }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading,  setIsLoading]  = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) { setImageError(true); setIsLoading(false); }
    }, 10000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (imageError) {
    return (
      <Alert
        message="Failed to load image"
        description={<><p>The image could not be displayed.</p><Button type="primary" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>Open in New Tab</Button></>}
        type="warning" showIcon
      />
    );
  }

  return (
    <div>
      {isLoading && <div style={{ textAlign: "center", padding: 40 }}><Spin tip="Loading image..." /></div>}
      <img
        src={url}
        alt={description || "Preview"}
        onError={() => { setImageError(true); setIsLoading(false); }}
        onLoad={() => setIsLoading(false)}
        style={{ display: isLoading ? "none" : "block", maxWidth: "100%", height: "auto", border: "1px solid #d9d9d9", borderRadius: 4 }}
      />
      <DescriptionCaption text={description} />
    </div>
  );
};

const SecurePDFPreview = ({ url, description }) => {
  const [pdfError,        setPdfError]        = useState(false);
  const [useGoogleViewer, setUseGoogleViewer] = useState(false);
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button type="primary" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
          Open PDF in New Tab
        </Button>
        {pdfError && !useGoogleViewer && (
          <Button onClick={() => setUseGoogleViewer(true)}>Try Google Viewer</Button>
        )}
      </div>

      {!pdfError && !useGoogleViewer ? (
        <iframe src={url} title={description || "PDF Preview"} width="100%" height="500px"
          style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}
          onError={() => setPdfError(true)} />
      ) : useGoogleViewer ? (
        <iframe src={googleViewerUrl} title={description || "PDF Preview (Google Viewer)"} width="100%" height="500px"
          style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}
          onError={() => { setPdfError(true); setUseGoogleViewer(false); }} />
      ) : (
        <Alert message="PDF preview unavailable"
          description="The PDF could not be embedded due to CORS restrictions. Please use the button above to open it in a new tab."
          type="warning" showIcon />
      )}
      <DescriptionCaption text={description} />
    </div>
  );
};

// ── Helper: format date string to dd/mm/yyyy ──────────────────────────────────
const formatIndianDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// ── Helper: capitalize first letter of each word ──────────────────────────────
const capitalizeWords = (str) => {
  if (!str) return str;
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
};

// ── File icon helper ──────────────────────────────────────────────────────────
const getFileIcon = (url) => {
  switch (getFileTypeFromUrl(url)) {
    case "pdf":   return pdfIcon;
    case "image": return imageIcon;
    case "word":  return wordIcon;
    case "excel": return excelIcon;
    default:      return defaultIcon;
  }
};

const truncateText = (text, maxLength = 13) =>
  !text ? "No description" : text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

// ── Action handlers ───────────────────────────────────────────────────────────
const openDialer  = (number) => { window.location.href = `tel:${number}`; };
const openMailer  = (email)  => { window.location.href = `mailto:${email}`; };
const openWebsite = (url)    => {
  const href = url.startsWith("http") ? url : `https://${url}`;
  window.open(href, "_blank", "noopener,noreferrer");
};

// ── Confirmation Modal (call / email / website) ───────────────────────────────
const ConfirmActionModal = ({ visible, type, value, onClose }) => {
  const handleConfirm = () => {
    if (type === "phone")        openDialer(value);
    else if (type === "email")   openMailer(value);
    else if (type === "website") openWebsite(value);
    onClose();
  };
  const titles   = { phone: "Call", email: "Send Email", website: "Open Website" };
  const messages = {
    phone:   `Call ${value}?`,
    email:   `Open mail client for ${value}?`,
    website: `Open ${value} in a new tab?`,
  };
  return (
    <Modal open={visible} title={titles[type] || "Confirm"} onOk={handleConfirm} onCancel={onClose} okText="Yes" cancelText="No" centered>
      <p style={{ fontSize: 16 }}>{messages[type]}</p>
    </Modal>
  );
};

// ── Boxed icon (left) + plain text ────────────────────────────────────────────
const IconWithText = ({ icon, text, onIconClick }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
    <span
      onClick={onIconClick}
      style={{
        cursor: "pointer", color: "#000", fontSize: 15, lineHeight: 1,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30, border: "1px solid #d9d9d9", borderRadius: 6,
        background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", flexShrink: 0,
      }}
    >
      {icon}
    </span>
    <span style={{ cursor: "default" }}>{text}</span>
  </span>
);

// ========== MAIN COMPONENT ==========
const OrganizationCollapseContent = ({ org, documents = [], documentsLoading = false }) => {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [actionModal,       setActionModal]       = useState({ visible: false, type: "", value: "" });

  // Document preview modal state (same as BranchCollapseContent)
  const [isModalOpen,          setIsModalOpen]          = useState(false);
  const [selectedFile,         setSelectedFile]         = useState(null);
  const [selectedDocType,      setSelectedDocType]      = useState("");
  const [selectedDescription,  setSelectedDescription]  = useState("");
  const [fileType,             setFileType]             = useState("");
  const [isVerifying,          setIsVerifying]          = useState(false);
  const [verificationError,    setVerificationError]    = useState(null);
  const [verificationWarning,  setVerificationWarning]  = useState(null);

  if (!org) return null;

  const showAction  = (type, value) => setActionModal({ visible: true, type, value });
  const closeAction = ()            => setActionModal({ visible: false, type: "", value: "" });

  // ── Open file (same logic as BranchCollapseContent) ──────────────────────
  const handleOpenFile = async (url, docType = "Document Preview", description = "") => {
    setIsVerifying(true);
    setVerificationError(null);
    setVerificationWarning(null);
    try {
      const urlCheck = isUrlSafe(url);
      if (!urlCheck.safe) { setVerificationError(urlCheck.reason); setIsVerifying(false); return; }
      const extensionType = getFileTypeFromUrl(url);
      if (extensionType === "blocked") { setVerificationError('This file type is blocked for security reasons'); setIsVerifying(false); return; }
      const contentCheck = await verifyContentType(url);
      if (!contentCheck.safe) { setVerificationError(contentCheck.reason); setIsVerifying(false); return; }
      setSelectedFile(url);
      setSelectedDocType(docType);
      setSelectedDescription(description);
      setFileType(contentCheck.type || extensionType);
      setIsModalOpen(true);
    } catch (error) {
      setVerificationError('An error occurred while opening the file');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    setSelectedDocType("");
    setSelectedDescription("");
    setFileType("");
    setVerificationError(null);
    setVerificationWarning(null);
  };

  const renderPreview = () => {
    if (!selectedFile) return <p>No file selected</p>;
    switch (fileType) {
      case "pdf":
        return <SecurePDFPreview url={selectedFile} description={selectedDescription} />;
      case "image":
        return <SecureImagePreview url={selectedFile} description={selectedDescription} />;
      case "excel":
      case "word":
        return (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Alert message={`${fileType === "excel" ? "Excel" : "Word"} File`} description="Preview not supported. Click below to open." type="info" showIcon />
            <Button type="primary" size="large" style={{ marginTop: 16 }} onClick={() => window.open(selectedFile, '_blank', 'noopener,noreferrer')}>
              Open {fileType === "excel" ? "Excel" : "Word"} File
            </Button>
            <DescriptionCaption text={selectedDescription} />
          </div>
        );
      case "video":
        return (
          <div style={{ textAlign: 'center' }}>
            <video controls style={{ maxWidth: '100%', maxHeight: 500 }} controlsList="nodownload">
              <source src={selectedFile} />
              Your browser does not support video playback.
            </video>
            <DescriptionCaption text={selectedDescription} />
          </div>
        );
      default:
        return (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Alert message="Preview not available" description="This file type cannot be previewed in the browser." type="warning" showIcon />
            <Button type="primary" size="large" style={{ marginTop: 16 }} onClick={() => window.open(selectedFile, '_blank', 'noopener,noreferrer')}>
              Download or Open in New Tab
            </Button>
            <DescriptionCaption text={selectedDescription} />
          </div>
        );
    }
  };

  // Parse partner_details safely
  let partners = [];
  if (org.partner_details) {
    try {
      const pd = typeof org.partner_details === "string" ? JSON.parse(org.partner_details) : org.partner_details;
      if (Array.isArray(pd)) partners = pd;
    } catch (_) {}
  }

  // Parse geo_location string → { lat, lng }
  const parseLocation = (locationString) => {
    if (!locationString) return null;
    const [lat, lng] = locationString.split(",").map((c) => c.trim());
    if (lat && lng) return { lat: parseFloat(lat), lng: parseFloat(lng) };
    return null;
  };

  const locationCoords = parseLocation(org.geo_location);
  const NA = "N/A";

  const labelStyle = {
    fontWeight: 600, background: "#e5e4e4ff", width: "180px", fontSize: "18px",
  };
  const contentStyle = {
    fontSize: "18px", fontWeight: 600, color: "#000", width: "100%",
  };

  return (
    <>
      <div style={{ background: "#fff", padding: "0px" }}>
        <Descriptions
          bordered size="small"
          column={{ xs: 1, sm: 2, md: 3 }}
          labelStyle={labelStyle}
          contentStyle={contentStyle}
        >
          {/* ── Basic Info ─────────────────────────────────────────────── */}
          <Descriptions.Item label="Firm Name">{org.firm_name || NA}</Descriptions.Item>
          <Descriptions.Item label="Firm Address">{org.firm_address || NA}</Descriptions.Item>
          <Descriptions.Item label="Proprietor">{org.proprietor_name || NA}</Descriptions.Item>

          <Descriptions.Item label="Mobile">
            {org.proprietor_mobilenumber ? (
              <IconWithText icon={<PhoneOutlined />} text={org.proprietor_mobilenumber} onIconClick={() => showAction("phone", org.proprietor_mobilenumber)} />
            ) : NA}
          </Descriptions.Item>

          <Descriptions.Item label="Landline">
            {org.landline_number ? (
              <IconWithText icon={<PhoneOutlined />} text={org.landline_number} onIconClick={() => showAction("phone", org.landline_number)} />
            ) : NA}
          </Descriptions.Item>

          <Descriptions.Item label="Fax">{org.fax_number || NA}</Descriptions.Item>

          <Descriptions.Item label="Email">
            {org.firm_email ? (
              <IconWithText icon={<MailOutlined />} text={org.firm_email} onIconClick={() => showAction("email", org.firm_email)} />
            ) : NA}
          </Descriptions.Item>

          <Descriptions.Item label="Website">
            {org.website ? (
              <IconWithText icon={<GlobalOutlined />} text={org.website} onIconClick={() => showAction("website", org.website)} />
            ) : NA}
          </Descriptions.Item>

          {/* ── Address ────────────────────────────────────────────────── */}
          <Descriptions.Item label="Door No.">{org.door_number || NA}</Descriptions.Item>
          <Descriptions.Item label="Street">{org.street_name || NA}</Descriptions.Item>
          <Descriptions.Item label="Place">{org.place || NA}</Descriptions.Item>
          <Descriptions.Item label="Landmark">{org.landmark || NA}</Descriptions.Item>
          <Descriptions.Item label="District">{org.district || NA}</Descriptions.Item>
          <Descriptions.Item label="Pincode">{org.pincode || NA}</Descriptions.Item>
          <Descriptions.Item label="State">{org.state || NA}</Descriptions.Item>

          {/* ── Geo Location ───────────────────────────────────────────── */}
          <Descriptions.Item label="Geo Location">
            {locationCoords ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <span
                  onClick={() => setShowLocationModal(true)}
                  style={{
                    cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 30, height: 30, border: "1px solid #d9d9d9", borderRadius: 6,
                    background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", flexShrink: 0,
                  }}
                >
                  <img src={location2} alt="location" style={{ width: 16, height: 16 }} />
                </span>
                <span onClick={() => setShowLocationModal(true)} style={{ color: "#1677ff", textDecoration: "underline", cursor: "pointer" }}>
                  Saved Location
                </span>
              </span>
            ) : NA}
          </Descriptions.Item>

          {/* ── Dates ──────────────────────────────────────────────────── */}
          <Descriptions.Item label="Est. Date">{formatIndianDate(org.firm_established_date) || NA}</Descriptions.Item>
          <Descriptions.Item label="DOJ">{formatIndianDate(org.doj) || NA}</Descriptions.Item>

          {/* ── Partners ───────────────────────────────────────────────── */}
          {partners.length > 0 && partners.map((p, i) => (
            <React.Fragment key={i}>
              <Descriptions.Item label={`Partner ${i + 1}`}>{p.name || NA}</Descriptions.Item>
              <Descriptions.Item label={`Partner ${i + 1} Mobile`}>
                {p.mobile ? (
                  <IconWithText icon={<PhoneOutlined />} text={p.mobile} onIconClick={() => showAction("phone", p.mobile)} />
                ) : NA}
              </Descriptions.Item>
              {i === partners.length - 1 && partners.length % 3 !== 0 && (
                <Descriptions.Item label="">{""}</Descriptions.Item>
              )}
            </React.Fragment>
          ))}

          {/* ── Documents (same design as BranchCollapseContent) ───────── */}
          {documentsLoading && (
            <Descriptions.Item label="Documents" span={3}>
              <Spin size="small" tip="Loading documents..." />
            </Descriptions.Item>
          )}

          {!documentsLoading && documents.length > 0 && documents.map((doc, index) => {
            const fileUrl = doc.signed_url || doc.file_url || doc.url;
            if (!fileUrl) return null;
            const docType = capitalizeWords(doc.document_type) || `Document ${index + 1}`;
            const desc    = doc.document_description || "";
            const iconUrl = getFileIcon(fileUrl);
            return (
              <Descriptions.Item key={`org-doc-${doc.id || index}`} label={docType} span={1}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img src={iconUrl} alt="File Icon" width={20} height={20} />
                  <span
                    onClick={() => handleOpenFile(fileUrl, docType, desc)}
                    title={desc}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                    onKeyPress={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleOpenFile(fileUrl, docType, desc); } }}
                  >
                    <Tag color="green" style={{ fontSize: "18px" }}>{truncateText(desc)}</Tag>
                  </span>
                </div>
              </Descriptions.Item>
            );
          })}
        </Descriptions>

        {verificationError && (
          <Alert message="Security Warning" description={verificationError} type="error" showIcon closable
            onClose={() => setVerificationError(null)} style={{ marginTop: 16 }} />
        )}
      </div>

      {/* ── Document Preview Modal (same as BranchCollapseContent) ─────── */}
      <Modal
        title={selectedDocType ? `${selectedDocType} - Preview` : "Document Preview"}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={[<Button key="cancel" onClick={handleCancel}>Close</Button>]}
        width={800}
        centered
        destroyOnClose
      >
        {isVerifying ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin tip="Verifying file security..." /></div>
        ) : (
          <>
            {verificationWarning && (
              <Alert message={verificationWarning} type="warning" showIcon closable style={{ marginBottom: 16 }} />
            )}
            {renderPreview()}
          </>
        )}
      </Modal>

      {/* ── Location Map Modal ────────────────────────────────────────── */}
      {locationCoords && (
        <LocationMapModal
          visible={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          initialLocation={{
            lat: locationCoords.lat.toFixed(6),
            lng: locationCoords.lng.toFixed(6),
            address: `${locationCoords.lat.toFixed(6)}, ${locationCoords.lng.toFixed(6)}`,
          }}
          editable={false}
          showCurrentLocation={false}
          title="Organization Location"
        />
      )}

      {/* ── Call / Email / Website Confirmation Modal ─────────────────── */}
      <ConfirmActionModal
        visible={actionModal.visible}
        type={actionModal.type}
        value={actionModal.value}
        onClose={closeAction}
      />
    </>
  );
};

export default OrganizationCollapseContent;