import React, { useState, useEffect } from "react";
import { Descriptions, Modal, Button, Alert, Spin, Tag } from "antd";
import pdfIcon from "../../assets/icons/pdf.png";
import imageIcon from "../../assets/icons/image.png";
import excelIcon from "../../assets/icons/excel.png";
import wordIcon from "../../assets/icons/word.png";
import defaultIcon from "../../assets/icons/default.png";
import "./BranchCollapseContent.css";

// ========== SECURITY CONFIGURATION ==========
const ALLOWED_DOMAINS = [
  'storage.googleapis.com',
  'storage.cloud.google.com',
];

const BLOCKED_EXTENSIONS = ['svg', 'xml', 'html', 'htm', 'js', 'exe', 'bat', 'sh', 'scr', 'vbs'];
const BLOCKED_MIME_TYPES = [
  'image/svg+xml', 'text/html', 'application/javascript',
  'application/x-javascript', 'text/xml', 'application/x-msdownload', 'application/x-sh'
];

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
        const googleDate    = urlObj.searchParams.get('X-Goog-Date');
        const expiresSeconds = parseInt(urlObj.searchParams.get('X-Goog-Expires'));
        if (googleDate && !isNaN(expiresSeconds)) {
          const year = parseInt(googleDate.slice(0, 4)), month = parseInt(googleDate.slice(4, 6)) - 1,
                day  = parseInt(googleDate.slice(6, 8)), hour  = parseInt(googleDate.slice(9, 11)),
                min  = parseInt(googleDate.slice(11, 13)), sec  = parseInt(googleDate.slice(13, 15));
          const issuedAt  = Date.UTC(year, month, day, hour, min, sec);
          const expiresAt = issuedAt + expiresSeconds * 1000;
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
  const cleanUrl   = url.split("?")[0].toLowerCase();
  const pathParts  = cleanUrl.split('/');
  const filename   = pathParts[pathParts.length - 1];
  const extension  = filename.split('.').pop();
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
// Centered description shown below image / PDF
const DescriptionCaption = ({ text }) =>
  text ? (
    <div style={{ textAlign: "center", marginTop: 10, fontSize: 14, color: "#555", fontStyle: "italic" }}>
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
    <div className="secure-image-container">
      {isLoading && <div style={{ textAlign: "center", padding: 40 }}><Spin tip="Loading image..." /></div>}
      <img
        src={url}
        alt={description || "Preview"}
        className="image-preview"
        onError={() => { setImageError(true); setIsLoading(false); }}
        onLoad={() => setIsLoading(false)}
        style={{ display: isLoading ? "none" : "block", maxWidth: "100%", height: "auto" }}
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
    <div className="secure-pdf-container">
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button type="primary" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
          Open PDF in New Tab
        </Button>
        {pdfError && !useGoogleViewer && (
          <Button onClick={() => setUseGoogleViewer(true)}>Try Google Viewer</Button>
        )}
      </div>

      {!pdfError && !useGoogleViewer ? (
        <iframe
          src={url}
          title={description || "PDF Preview"}
          width="100%"
          height="500px"
          className="pdf-preview"
          style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}
          onError={() => { console.error('PDF iframe failed'); setPdfError(true); }}
        />
      ) : useGoogleViewer ? (
        <iframe
          src={googleViewerUrl}
          title={description || "PDF Preview (Google Viewer)"}
          width="100%"
          height="500px"
          className="pdf-preview"
          style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}
          onError={() => { setPdfError(true); setUseGoogleViewer(false); }}
        />
      ) : (
        <Alert
          message="PDF preview unavailable"
          description="The PDF could not be embedded due to CORS restrictions. Please use the button above to open it in a new tab."
          type="warning" showIcon
        />
      )}

      <DescriptionCaption text={description} />
    </div>
  );
};

// ========== MAIN COMPONENT ==========
const BranchCollapseContent = ({ branch, details, documents = [], documentsLoading = false }) => {
  const [isModalOpen,         setIsModalOpen]         = useState(false);
  const [selectedFile,        setSelectedFile]        = useState(null);
  const [selectedDocType,     setSelectedDocType]     = useState("");     // ← modal title
  const [selectedDescription, setSelectedDescription] = useState("");     // ← caption below preview
  const [fileType,            setFileType]            = useState("");
  const [isVerifying,         setIsVerifying]         = useState(false);
  const [verificationError,   setVerificationError]   = useState(null);
  const [verificationWarning, setVerificationWarning] = useState(null);

  if (!branch || !details) {
    return (
      <div className="branch-loading-container">
        <Spin tip="Loading branch details..." />
      </div>
    );
  }

  const truncateText = (text, maxLength = 13) =>
    !text ? "No description available" : text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

  const getFileIcon = (url) => {
    const type = getFileTypeFromUrl(url);
    switch (type) {
      case "pdf":   return pdfIcon;
      case "image": return imageIcon;
      case "word":  return wordIcon;
      case "excel": return excelIcon;
      default:      return defaultIcon;
    }
  };

  // ── Open file: now accepts docType + description ──────────────────────────
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

  return (
    <>
      <div className="branch-content-container">
        <Descriptions
          bordered
          size="small"
          column={{ xs: 1, sm: 2, md: 3 }}
          labelStyle={{ fontWeight: 600, backgroundColor: "#e5e4e4", width: "140px", minWidth: "100px", padding: '5px' }}
          contentStyle={{ backgroundColor: "#ffffff", width: "200px", minWidth: "130px", overflow: "hidden", textOverflow: "ellipsis", padding: '5px' }}
        >
          <Descriptions.Item label="Code" span={1}>{details.branch_code}</Descriptions.Item>
          <Descriptions.Item label="Name" span={1}>{branch.branch_name}</Descriptions.Item>
          <Descriptions.Item label="Address" span={3}>{branch.branch_address}</Descriptions.Item>

          {/* Documents loading spinner */}
          {documentsLoading && (
            <Descriptions.Item label="Documents" span={3}>
              <Spin size="small" tip="Loading documents..." />
            </Descriptions.Item>
          )}

          {/* Document rows — pass docType as title, description as caption */}
          {!documentsLoading && documents.length > 0 &&
            documents.map((doc, index) => {
              const iconUrl = getFileIcon(doc.signed_url);
              const docType = doc.document_type || `Document ${index + 1}`;
              const desc    = doc.document_description || "";
              return (
                <Descriptions.Item key={`branch-doc-${doc.id}`} label={docType} span={1}>
                  <div className="file-item-container">
                    <img src={iconUrl} alt="File Icon" width={20} height={20} />
                    <span
  onClick={() => handleOpenFile(doc.signed_url, docType, desc)}
  title={desc}
  role="button"
  tabIndex={0}
  onKeyPress={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleOpenFile(doc.signed_url, docType, desc); } }}
  style={{ cursor: "pointer" }}
>
 <Tag color="green" style={{ fontSize: "18px" }}>{truncateText(desc)}</Tag>
</span>
                  </div>
                </Descriptions.Item>
              );
            })
          }
        </Descriptions>

        {verificationError && (
          <Alert message="Security Warning" description={verificationError} type="error" showIcon closable onClose={() => setVerificationError(null)} style={{ marginTop: 16 }} />
        )}
      </div>

      {/* Document Preview Modal — title = document type */}
      <Modal
        title={selectedDocType || "Document Preview"}
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
    </>
  );
};

export default BranchCollapseContent;