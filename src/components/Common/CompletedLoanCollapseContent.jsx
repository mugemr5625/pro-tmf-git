import React from "react";
import { Descriptions, Tag, Typography } from "antd";
import {
  CheckCircleFilled,
  UserOutlined,
  BankOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

// ─── Mask: show only meaningful trailing digits ────────────────────────────────
const maskAccountNumber = (accNo) => {
  if (!accNo) return "N/A";
  const str = String(accNo);
  const last6 = str.slice(-6);
  const meaningful = last6.replace(/^0+/, "");
  const xCount = 6 - meaningful.length;
  return "x".repeat(xCount) + meaningful;
};

const headerLabelStyle   = { background: "#52c41a", color: "#fff", fontSize: "15px", fontWeight: "bold" };
const headerContentStyle = { background: "#52c41a", color: "#fff", fontSize: "15px", fontWeight: "bold" };
const subLabelStyle      = { background: "#389e0d", color: "#fff", fontSize: "15px", fontWeight: "bold" };
const subContentStyle    = { background: "#389e0d", color: "#fff", fontSize: "15px", fontWeight: "bold" };
const labelStyle         = { fontSize: "15px", fontWeight: 600, background: "#d9f7be", color: "#237804", width: "160px" };
const contentStyle       = { fontSize: "15px", fontWeight: 500 };

const CompletedLoanCollapseContent = ({ customer }) => {
  if (!customer) return null;

  // Read exact API field names — no fragile fallback chains
  const customerName = customer.customer_name     || "—";
  const customerId   = customer.customer_id        || "—";
  const orderNo      = customer.customer_order_no  ?? "—";
  const loanAccounts = Array.isArray(customer.loan_account_numbers) ? customer.loan_account_numbers : [];
  const totalLoans   = customer.total_active_loans ?? loanAccounts.length;

  return (
    <div style={{ background: "#fff", padding: "0px" }}>

      {/* Banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 16px",
        background: "linear-gradient(90deg, #f6ffed 0%, #fff 100%)",
        borderBottom: "1px solid #b7eb8f",
        borderRadius: "4px 4px 0 0",
        marginBottom: "12px",
      }}>
        <CheckCircleFilled style={{ fontSize: "22px", color: "#52c41a" }} />
        <Text style={{ fontSize: "16px", fontWeight: 700, color: "#389e0d" }}>Loan Fully Repaid</Text>
      </div>

      {/* Customer summary */}
      <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }} labelStyle={labelStyle} contentStyle={contentStyle}>
        <Descriptions.Item label="Customer" span={3} labelStyle={headerLabelStyle} contentStyle={headerContentStyle}>
          <UserOutlined style={{ marginRight: "6px" }} />{customerName}
        </Descriptions.Item>
        <Descriptions.Item label="Customer ID:">
          <span style={{ fontFamily: "monospace" }}>{customerId}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Order No:">{String(orderNo)}</Descriptions.Item>
        <Descriptions.Item label="Total Loans:">
          <Tag color="green" style={{ fontSize: "14px", fontWeight: 600 }}>
            {totalLoans} {totalLoans === 1 ? "Loan" : "Loans"}
          </Tag>
        </Descriptions.Item>
      </Descriptions>

      {/* Loan accounts */}
      {loanAccounts.length > 0 ? (
        <div style={{ marginTop: "16px" }}>
          <Descriptions bordered size="small" column={1} labelStyle={labelStyle} contentStyle={contentStyle}>
            <Descriptions.Item
              label={<span><BankOutlined style={{ marginRight: "6px" }} />Loan Accounts</span>}
              span={1} labelStyle={subLabelStyle} contentStyle={subContentStyle}
            >
              {loanAccounts.length} account{loanAccounts.length !== 1 ? "s" : ""} on record
            </Descriptions.Item>
            {loanAccounts.map((accNo, idx) => (
              <Descriptions.Item
                key={idx}
                label={<span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FileTextOutlined />Loan {idx + 1}</span>}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "15px", color: "#595959" }}>
                    {maskAccountNumber(accNo)}
                  </span>
                  <span style={{ fontFamily: "monospace", fontSize: "13px", color: "#8c8c8c", background: "#f5f5f5", padding: "2px 8px", borderRadius: "4px", border: "1px solid #d9d9d9" }}>
                    {accNo}
                  </span>
                  <Tag color="green" icon={<CheckCircleFilled />} style={{ fontSize: "12px" }}>Completed</Tag>
                </div>
              </Descriptions.Item>
            ))}
          </Descriptions>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "20px", background: "#f6ffed", marginTop: "12px", borderRadius: "4px", border: "1px solid #b7eb8f" }}>
          <Tag color="green" style={{ fontSize: "14px" }}>No account numbers available</Tag>
        </div>
      )}
    </div>
  );
};

export default CompletedLoanCollapseContent;