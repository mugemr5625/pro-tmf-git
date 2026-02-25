import React, { useState } from "react";
import { Descriptions, Button } from "antd";
import LocationMapModal from "./LocationMapModal";
import location2 from "../../assets/icons/location (1).png";

const OrganizationCollapseContent = ({ org }) => {
  const [showLocationModal, setShowLocationModal] = useState(false);

  if (!org) return null;

  // Parse partner_details safely
  let partners = [];
  if (org.partner_details) {
    try {
      const pd =
        typeof org.partner_details === "string"
          ? JSON.parse(org.partner_details)
          : org.partner_details;
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
    fontWeight: 600,
    background: "#e5e4e4ff",
    width: "180px",
    fontSize: "18px",
  };

  const contentStyle = {
    fontSize: "18px",
    fontWeight: 600,
  };

  return (
    <>
      <div style={{ background: "#fff", padding: "0px" }}>
        <Descriptions
          bordered
          size="small"
          column={{ xs: 1, sm: 2, md: 3 }}
          labelStyle={labelStyle}
          contentStyle={contentStyle}
        >
          {/* ── Basic Info ──────────────────────────────────────────────────── */}
          <Descriptions.Item label="Org ID">{org.id || NA}</Descriptions.Item>
          <Descriptions.Item label="Firm Name">{org.firm_name || NA}</Descriptions.Item>
          <Descriptions.Item label="Firm Address">{org.firm_address || NA}</Descriptions.Item>

          <Descriptions.Item label="Proprietor">{org.proprietor_name || NA}</Descriptions.Item>
          <Descriptions.Item label="Mobile">
            {org.proprietor_mobilenumber
              ? <a href={`tel:${org.proprietor_mobilenumber}`}>{org.proprietor_mobilenumber}</a>
              : NA}
          </Descriptions.Item>
          <Descriptions.Item label="Landline">{org.landline_number || NA}</Descriptions.Item>

          <Descriptions.Item label="Fax">{org.fax_number || NA}</Descriptions.Item>
          <Descriptions.Item label="Email">
            {org.firm_email
              ? <a href={`mailto:${org.firm_email}`}>{org.firm_email}</a>
              : NA}
          </Descriptions.Item>
          <Descriptions.Item label="Website">
            {org.website
              ? <a href={org.website} target="_blank" rel="noopener noreferrer">{org.website}</a>
              : NA}
          </Descriptions.Item>

          {/* ── Address ─────────────────────────────────────────────────────── */}
          <Descriptions.Item label="Door No.">{org.door_number || NA}</Descriptions.Item>
          <Descriptions.Item label="Street">{org.street_name || NA}</Descriptions.Item>
          <Descriptions.Item label="Landmark">{org.landmark || NA}</Descriptions.Item>

          <Descriptions.Item label="Place">{org.place || NA}</Descriptions.Item>
          <Descriptions.Item label="District">{org.district || NA}</Descriptions.Item>
          <Descriptions.Item label="Pincode">{org.pincode || NA}</Descriptions.Item>

          <Descriptions.Item label="State">{org.state || NA}</Descriptions.Item>

          {/* ── Geo Location — same style as CustomerCollapseContent ────────── */}
          <Descriptions.Item label="Geo Location">
            {locationCoords ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Button
                  type="link"
                  size="small"
                  icon={<img src={location2} alt="location" style={{ width: 18, height: 18 }} />}
                  onClick={() => setShowLocationModal(true)}
                  style={{ padding: 0, fontSize: "18px" }}
                >
                  Saved Location
                </Button>
              </div>
            ) : (
              NA
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Est. Date">{org.firm_established_date || NA}</Descriptions.Item>

          <Descriptions.Item label="DOJ">{org.doj || NA}</Descriptions.Item>

          {/* ── Partners (inline in same table) ────────────────────────────── */}
          {partners.length > 0 &&
            partners.map((p, i) => (
              <React.Fragment key={i}>
                <Descriptions.Item label={`Partner ${i + 1}`}>
                  {p.name || NA}
                </Descriptions.Item>
                <Descriptions.Item label={`Partner ${i + 1} Mobile`}>
                  {p.mobile
                    ? <a href={`tel:${p.mobile}`}>{p.mobile}</a>
                    : NA}
                </Descriptions.Item>
                {/* filler cell so the last partner row fills the 3-column grid */}
                {i === partners.length - 1 && partners.length % 3 !== 0 && (
                  <Descriptions.Item label="">{""}</Descriptions.Item>
                )}
              </React.Fragment>
            ))}
        </Descriptions>
      </div>

      {/* ── Location Map Modal ─────────────────────────────────────────────── */}
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
    </>
  );
};

export default OrganizationCollapseContent;