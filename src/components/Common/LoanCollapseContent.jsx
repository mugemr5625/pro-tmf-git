import React, { useState } from "react";
import { Descriptions, Tag, Tooltip } from "antd";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";

// ─── Utility: mask account number showing only meaningful last 6 digits ────────
const maskAccountNumber = (accNo) => {
  if (!accNo) return "N/A";
  const str = String(accNo);
  const last6 = str.slice(-6);                 // e.g. "000028"
  const meaningful = last6.replace(/^0+/, ""); // e.g. "28"
  const xCount = 6 - meaningful.length;        // e.g. 4
  return "x".repeat(xCount) + meaningful;      // e.g. "xxxx28"
};

const LoanCollapseContent = ({ customer, loans = [] }) => {
  const [visibleOnlineRemarks, setVisibleOnlineRemarks] = useState({});
  const [visibleCashRemarks, setVisibleCashRemarks] = useState({});

  if (!customer) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return "₹0";
    return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
  };

  const toggleOnlineRemarks = (loanIndex) => {
    setVisibleOnlineRemarks(prev => ({
      ...prev,
      [loanIndex]: !prev[loanIndex]
    }));
  };

  const toggleCashRemarks = (loanIndex) => {
    setVisibleCashRemarks(prev => ({
      ...prev,
      [loanIndex]: !prev[loanIndex]
    }));
  };

  const getLoanCaptionColor = (index) => {
    const colors = [
      '#1890ff', // Blue - First loan
      '#fa8c16', // Orange - Second loan
    ];
    return colors[index % colors.length];
  };

  const calculateLoanTotal = (loan) => {
    const loanAmount = parseFloat(loan.loan_dsbrsmnt_amnt || 0);
    const interestAmount = parseFloat(loan.loan_dsbrsmnt_intrst_amnt || 0);
    const processingFee = parseFloat(loan.loan_dsbrsmnt_prcsng_fee_amnt || 0);
    return loanAmount + interestAmount + processingFee;
  };

  return (
    <div style={{ background: "#fff", padding: "0px 0px" }}>

      {/* Individual Loan Details */}
      {loans && loans.length > 0 && loans.map((loan, index) => (
        <div
          key={index}
          style={{
            marginTop: index === 0 ? '0px' : '16px',
          }}
        >
          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2, md: 3 }}
            labelStyle={{
              fontSize: '18px',
              fontWeight: 600,
              background: getLoanCaptionColor(index),
              color: "#fff",
              width: "160px",
            }}
            contentStyle={{
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            {/* ── Loan header — first full-width row inside the table ── */}
            <Descriptions.Item
              label={`Loan ${index + 1}`}
              span={3}
              labelStyle={{
                background: getLoanCaptionColor(index),
                color: '#fff',
                fontSize: '18px',
                fontWeight: 'bold',
              }}
              contentStyle={{
                background: getLoanCaptionColor(index),
                color: '#fff',
                fontSize: '18px',
                fontWeight: 'bold',
                letterSpacing: '1px',
              }}
            >
              A/C: {maskAccountNumber(loan.loan_account_number)}
            </Descriptions.Item>

            <Descriptions.Item label="Account Number:">
              {maskAccountNumber(loan.loan_account_number)}
            </Descriptions.Item>
            <Descriptions.Item label="Account Code:">
              {loan.loan_account_code || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Repayment Type:">
              <Tag color={
                loan.loan_dsbrsmnt_repmnt_type === 'Daily' ? 'green' :
                loan.loan_dsbrsmnt_repmnt_type === 'Weekly' ? 'blue' :
                loan.loan_dsbrsmnt_repmnt_type === 'Monthly' ? 'orange' : 'default'
              } style={{ fontSize: '18px' }}>
                {loan.loan_dsbrsmnt_repmnt_type || "N/A"}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Loan Amount:">
              {formatCurrency(loan.loan_dsbrsmnt_amnt)}
            </Descriptions.Item>
            <Descriptions.Item label="Interest Amount:">
              {formatCurrency(loan.loan_dsbrsmnt_intrst_amnt)}
            </Descriptions.Item>
            <Descriptions.Item label="Processing Fee:">
              {formatCurrency(loan.loan_dsbrsmnt_prcsng_fee_amnt)}
            </Descriptions.Item>

            <Descriptions.Item label="Total Installments:">
              {loan.loan_dsbrsmnt_tot_instlmnt || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Installment Amount:">
              {formatCurrency(loan.loan_dsbrsmnt_instlmnt_amnt)}
            </Descriptions.Item>
            <Descriptions.Item label="Default Pay Amount:">
              {formatCurrency(loan.loan_dsbrsmnt_dflt_pay_amnt)}
            </Descriptions.Item>

            <Descriptions.Item label="Disbursement Date:">
              {formatDate(loan.loan_dsbrsmnt_dt)}
            </Descriptions.Item>
            <Descriptions.Item label="Bad Loan Days:">
              {loan.loan_dsbrsmnt_bad_loan_days || "0"} days
            </Descriptions.Item>
            <Descriptions.Item label="Mode:">
              <Tag color={
                loan.loan_dsbrsmnt_mode === 'Cash' ? 'gold' :
                loan.loan_dsbrsmnt_mode === 'Both' ? 'purple' : 'cyan'
              } style={{ fontSize: '18px' }}>
                {loan.loan_dsbrsmnt_mode || "N/A"}
              </Tag>
            </Descriptions.Item>

            {/* Show Online and Cash amounts when mode is "Both" */}
            {loan.loan_dsbrsmnt_mode === 'Both' && (
              <>
                <Descriptions.Item label="Online Amount:">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                      <span>{formatCurrency(loan.loan_dsbrsmnt_online_amnt)}</span>
                      {loan.loan_dsbrsmnt_online_cmt && (
                        <Tooltip title={visibleOnlineRemarks[index] ? "Click to hide remark" : "Click to view remark"}>
                          {visibleOnlineRemarks[index] ? (
                            <EyeInvisibleOutlined
                              style={{ fontSize: '20px', color: '#1890ff', cursor: 'pointer' }}
                              onClick={() => toggleOnlineRemarks(index)}
                            />
                          ) : (
                            <EyeOutlined
                              style={{ fontSize: '20px', color: '#1890ff', cursor: 'pointer' }}
                              onClick={() => toggleOnlineRemarks(index)}
                            />
                          )}
                        </Tooltip>
                      )}
                    </div>
                    {visibleOnlineRemarks[index] && loan.loan_dsbrsmnt_online_cmt && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        background: '#e6f7ff',
                        borderRadius: '4px',
                        borderLeft: '3px solid #1890ff',
                        fontSize: '15px'
                      }}>
                        <strong style={{ color: '#1890ff' }}>💳 Remark:</strong>
                        <div style={{ marginTop: '4px', color: '#595959' }}>
                          {loan.loan_dsbrsmnt_online_cmt}
                        </div>
                      </div>
                    )}
                  </div>
                </Descriptions.Item>

                <Descriptions.Item label="Cash Amount:">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                      <span>{formatCurrency(loan.loan_dsbrsmnt_cash_amnt)}</span>
                      {loan.loan_dsbrsmnt_cash_cmt && (
                        <Tooltip title={visibleCashRemarks[index] ? "Click to hide remark" : "Click to view remark"}>
                          {visibleCashRemarks[index] ? (
                            <EyeInvisibleOutlined
                              style={{ fontSize: '20px', color: '#faad14', cursor: 'pointer' }}
                              onClick={() => toggleCashRemarks(index)}
                            />
                          ) : (
                            <EyeOutlined
                              style={{ fontSize: '20px', color: '#faad14', cursor: 'pointer' }}
                              onClick={() => toggleCashRemarks(index)}
                            />
                          )}
                        </Tooltip>
                      )}
                    </div>
                    {visibleCashRemarks[index] && loan.loan_dsbrsmnt_cash_cmt && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        background: '#fffbe6',
                        borderRadius: '4px',
                        borderLeft: '3px solid #faad14',
                        fontSize: '15px'
                      }}>
                        <strong style={{ color: '#faad14' }}>💵 Remark:</strong>
                        <div style={{ marginTop: '4px', color: '#595959' }}>
                          {loan.loan_dsbrsmnt_cash_cmt}
                        </div>
                      </div>
                    )}
                  </div>
                </Descriptions.Item>
              </>
            )}

            <Descriptions.Item label="Status:">
              <Tag color={
                loan.loan_dsbrsmnt_status === 'Active' ? 'green' :
                loan.loan_dsbrsmnt_status === 'Closed' ? 'red' :
                loan.loan_dsbrsmnt_status === 'Pending' ? 'orange' : 'default'
              } style={{ fontSize: '18px' }}>
                {loan.loan_dsbrsmnt_status || "N/A"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Disbursed By:">
              {loan.LOAN_DSBRSMNT_CREATED_BY_FULL_NM || loan.LOAN_DSBRSMNT_CREATED_BY_NM || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Created Date:">
              {formatDate(loan.loan_dsbrsmnt_created_ts)}
            </Descriptions.Item>

            {/* Total Amount - full width */}
            <Descriptions.Item label="Total Amount:" span={3}>
              <span style={{
                fontSize: '20px',
                fontWeight: 700,
                color: getLoanCaptionColor(index)
              }}>
                {formatCurrency(calculateLoanTotal(loan))}
              </span>
            </Descriptions.Item>

            {/* Comment - full width */}
            {loan.loan_dsbrsmnt_comnt && (
              <Descriptions.Item label="Comment:" span={3}>
                {loan.loan_dsbrsmnt_comnt}
              </Descriptions.Item>
            )}
          </Descriptions>
        </div>
      ))}

      {/* No Loans Message */}
      {(!loans || loans.length === 0) && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          background: '#fff7e6',
          marginTop: '0px',
          borderRadius: '4px'
        }}>
          <Tag color="orange" style={{ fontSize: '18px' }}>
            No active loans for this customer
          </Tag>
        </div>
      )}
    </div>
  );
};

export default LoanCollapseContent;