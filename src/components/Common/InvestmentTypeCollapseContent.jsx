import React from "react";
import { Descriptions } from "antd";
import dayjs from "dayjs";

const InvestmentTypeCollapseContent = ({ investmentType }) => {
  if (!investmentType) return null;

  return (
    <div style={{ background: "#fff", padding: "0px 0px" }}>
      <Descriptions
        bordered
        size="small"
        column={{ xs: 1, sm: 2, md: 3 }}
        labelStyle={{
          fontSize: "18px",
          fontWeight: 600,
          background: "#e5e4e4ff",
          width: "160px",
        }}
        contentStyle={{
          fontSize: "18px",
          fontWeight: 600,
        }}
      >
        <Descriptions.Item label="Branch Name:">
          {investmentType.branch_name || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Line Name:">
          {investmentType.line_name || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Multi-User:">
          {investmentType.multi_user_allocation ? "Yes" : "No"}
        </Descriptions.Item>
        <Descriptions.Item label="Entitled To:">
          {investmentType.entitled_to_username || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Created:">
          {investmentType.created_time
            ? dayjs(investmentType.created_time).format("DD-MMM-YYYY")
            : "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Modified:">
          {investmentType.modified_time
            ? dayjs(investmentType.modified_time).format("DD-MMM-YYYY")
            : "N/A"}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
};

export default InvestmentTypeCollapseContent;
