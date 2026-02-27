import React, { useState } from "react";
import { Descriptions, Tag, Modal } from "antd";
import { PhoneOutlined, MailOutlined } from "@ant-design/icons";

// ── Helper: format date string to dd/mm/yyyy ─────────────────────────────────
const formatIndianDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
};

// ── Action handlers ───────────────────────────────────────────────────────────
const openDialer = (number) => { window.location.href = `tel:${number}`; };
const openMailer = (email)  => { window.location.href = `mailto:${email}`; };

// ── Confirmation Modal ────────────────────────────────────────────────────────
const ConfirmActionModal = ({ visible, type, value, onClose }) => {
  const handleConfirm = () => {
    if (type === "phone")      openDialer(value);
    else if (type === "email") openMailer(value);
    onClose();
  };

  const titles   = { phone: "Call", email: "Send Email" };
  const messages = {
    phone: `Call ${value}?`,
    email: `Open mail client for ${value}?`,
  };

  return (
    <Modal
      open={visible}
      title={titles[type] || "Confirm"}
      onOk={handleConfirm}
      onCancel={onClose}
      okText="Yes"
      cancelText="No"
      centered
    >
      <p style={{ fontSize: 16 }}>{messages[type]}</p>
    </Modal>
  );
};

// ── Boxed icon on left, plain text on right (matches OrganizationCollapseContent) ──
const IconWithText = ({ icon, text, onIconClick }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
    {/* boxed icon — clickable */}
    <span
      onClick={onIconClick}
      style={{
        cursor: "pointer",
        color: "#000",
        fontSize: 15,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        border: "1px solid #d9d9d9",
        borderRadius: 6,
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
    {/* text — plain, not clickable */}
    <span style={{ cursor: "default" }}>{text}</span>
  </span>
);

// ── Main Component ────────────────────────────────────────────────────────────
const UserCollapseContent = ({ user }) => {
  const [actionModal, setActionModal] = useState({ visible: false, type: "", value: "" });

  if (!user) return null;

  const showAction  = (type, value) => setActionModal({ visible: true, type, value });
  const closeAction = ()            => setActionModal({ visible: false, type: "", value: "" });

  const oddColor  = "purple";
  const evenColor = "green";

  const getLineAllocationsByBranch = (allocations) => {
    if (!allocations || allocations.length === 0) return {};
    const branchMap = {};
    allocations.forEach((allocation) => {
      const branchName = allocation.branch_name || "Unknown Branch";
      const lineName   = allocation.line_name   || "Unknown Line";
      if (!branchMap[branchName]) branchMap[branchName] = new Set();
      branchMap[branchName].add(lineName);
    });
    Object.keys(branchMap).forEach((branch) => {
      branchMap[branch] = Array.from(branchMap[branch]);
    });
    return branchMap;
  };

  const getExpenseMappings = (expenses) => {
    if (!expenses || expenses.length === 0) return [];
    return expenses.map((expense) => ({
      expenseId:   expense.expense,
      expenseName: expense.expense_name || `Expense ID: ${expense.expense}`,
      branch:      expense.expense_branch_name || "N/A",
      line:        expense.expense_line_name   || "N/A",
    }));
  };

  const lineAllocationsByBranch = getLineAllocationsByBranch(user.line_allocations);
  const expenseMappings         = getExpenseMappings(user.user_expenses);
  const baseBranch              = user.base_branch_name;
  const baseLine                = user.base_line_name;

  const getOrganizedLineMappings = () => {
    const entries = Object.entries(lineAllocationsByBranch);
    if (entries.length === 0) return [];
    if (baseBranch && baseLine) {
      const baseEntry    = entries.find(([branch, lines]) => branch === baseBranch && lines.includes(baseLine));
      const otherEntries = entries.filter(([branch]) => branch !== baseBranch);
      if (baseEntry) return [baseEntry, ...otherEntries];
    }
    return entries;
  };

  const organizedLineMappings = getOrganizedLineMappings();

  const NA = "N/A";

  const labelStyle = {
    fontSize: "18px",
    fontWeight: 600,
    background: "#e5e4e4ff",
    width: "140px",
  };

  const contentStyle = {
    fontSize: "18px",
    fontWeight: 600,
    width: "100%",
  };

  return (
    <>
      <div style={{ background: "#fff", padding: "0px 0px" }}>
        <Descriptions
          bordered
          size="small"
          column={{ xs: 1, sm: 2, md: 3 }}
          labelStyle={labelStyle}
          contentStyle={contentStyle}
        >
          <Descriptions.Item label="User ID:">
            {user.id || NA}
          </Descriptions.Item>

          <Descriptions.Item label="Username:">
            {user.username || NA}
          </Descriptions.Item>

          <Descriptions.Item label="Full Name:">
            {user.full_name || NA}
          </Descriptions.Item>

          {/* Email — icon on right */}
          <Descriptions.Item label="Email:">
            {user.email ? (
              <IconWithText
                icon={<MailOutlined />}
                text={user.email}
                onIconClick={() => showAction("email", user.email)}
              />
            ) : NA}
          </Descriptions.Item>

          {/* Mobile — call icon on right */}
          <Descriptions.Item label="Mobile:">
            {user.mobile_number ? (
              <IconWithText
                icon={<PhoneOutlined />}
                text={user.mobile_number}
                onIconClick={() => showAction("phone", user.mobile_number)}
              />
            ) : NA}
          </Descriptions.Item>

          <Descriptions.Item label="Role:">
            {user.role_name?.toUpperCase() || NA}
          </Descriptions.Item>

          <Descriptions.Item label="Base Branch:">
            {baseBranch || NA}
          </Descriptions.Item>

          <Descriptions.Item label="Base Line:" span={2}>
            {baseLine || NA}
          </Descriptions.Item>

          <Descriptions.Item label="Address:" span={2}>
            {user.address || NA}
          </Descriptions.Item>

          <Descriptions.Item label="Pin Code:">
            {user.pin_code || NA}
          </Descriptions.Item>

          {/* Line Mapping */}
          <Descriptions.Item label="Line Mapping:" span={3}>
            {organizedLineMappings.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "100%", overflow: "hidden" }}>
                {organizedLineMappings.map(([branch, lines], index) => {
                  const isBase = index === 0 && branch === baseBranch;
                  const color  = organizedLineMappings.length > 1
                    ? (index % 2 === 0 ? oddColor : evenColor)
                    : "blue";
                  return (
                    <div key={branch} style={{ display: "flex", flexWrap: "wrap", gap: "4px", wordBreak: "break-word" }}>
                      <Tag
                        color={color}
                        style={{
                          marginRight: 0,
                          maxWidth: "100%",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          lineHeight: "1.5",
                          fontSize: "18px",
                          fontWeight: isBase ? 700 : 600,
                        }}
                      >
                        <span style={{ wordBreak: "break-word" }}>
                          {isBase && "(Base) "}
                          {branch} : {lines.join(", ")}
                        </span>
                      </Tag>
                    </div>
                  );
                })}
              </div>
            ) : NA}
          </Descriptions.Item>

          {/* Expense Mapping */}
          <Descriptions.Item label="Expense Mapping:" span={3}>
            {expenseMappings.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "100%", overflow: "hidden" }}>
                {expenseMappings.map((mapping, index) => {
                  const color = expenseMappings.length > 1
                    ? (index % 2 === 0 ? oddColor : evenColor)
                    : "blue";
                  return (
                    <div key={index} style={{ wordBreak: "break-word", overflow: "hidden" }}>
                      <Tag
                        color={color}
                        style={{
                          marginRight: 0,
                          maxWidth: "100%",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          lineHeight: "1.5",
                          fontSize: "18px",
                        }}
                      >
                        <span style={{ wordBreak: "break-word" }}>
                          {mapping.branch} : {mapping.line} : {mapping.expenseName}
                        </span>
                      </Tag>
                    </div>
                  );
                })}
              </div>
            ) : NA}
          </Descriptions.Item>

          <Descriptions.Item label="Allow Old Transaction:">
            {user.allow_old_transaction ? "Yes" : "No"}
          </Descriptions.Item>

         
        </Descriptions>
      </div>

      {/* ── Action Confirmation Modal ──────────────────────────────────────── */}
      <ConfirmActionModal
        visible={actionModal.visible}
        type={actionModal.type}
        value={actionModal.value}
        onClose={closeAction}
      />
    </>
  );
};

export default UserCollapseContent;