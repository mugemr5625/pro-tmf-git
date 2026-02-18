import { Button, Form, Select, Switch, notification, Space, Spin } from "antd";
import Loader from "components/Common/Loader";
import { POST, PUT, GET } from "helpers/api_helper";
import { Fragment, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BankOutlined,
  ApartmentOutlined,
  UserOutlined,
  TagOutlined,
} from "@ant-design/icons";
import InputWithAddon from "components/Common/InputWithAddon";
import SelectWithAddon from "components/Common/SelectWithAddon";
import "./AddInvestmentType.css";

const { Option } = Select;

const INVESTMENT_TYPE_API = "/api/investmenttypes/";

const AddInvestmentType = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const params = useParams();

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [userList, setUserList] = useState([]);
  const [lineList, setLineList] = useState([]);
  const [lineLoading, setLineLoading] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [selectedBranchName, setSelectedBranchName] = useState("");
  const [multiUserAllocation, setMultiUserAllocation] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);

      // Read branch from localStorage
      const storedBranchId = localStorage.getItem("selected_branch_id");
      const storedBranchName = localStorage.getItem("selected_branch_name");

      if (!storedBranchId) {
        notification.warning({
          message: "Branch Not Selected",
          description: "Please select a branch first.",
        });
        setLoading(false);
        return;
      }

      let branchId;
      try {
        branchId = JSON.parse(storedBranchId);
      } catch {
        branchId = storedBranchId;
      }

      let branchName;
      try {
        branchName = JSON.parse(storedBranchName);
        branchName = branchName?.branch_name || branchName?.name || branchName;
      } catch {
        branchName = storedBranchName;
      }

      setSelectedBranchId(branchId);
      setSelectedBranchName(branchName || "");

      await Promise.all([fetchUsers(), fetchLines(branchId)]);

      // If editing, load existing record
      if (params.id) {
        try {
          const res = await GET(`${INVESTMENT_TYPE_API}${params.id}/`);
          if (res?.status === 200) {
            const data = res.data;
            setMultiUserAllocation(data.multi_user_allocation);
            form.setFieldsValue({
              investment_title: data.investment_title,
              line: data.line,
              entitled_to: data.entitled_to,
              multi_user_allocation: data.multi_user_allocation,
            });
          }
        } catch (err) {
          notification.error({ message: "Error", description: "Failed to load investment type details." });
        }
      }

      setLoading(false);
    };

    init();
  }, [params.id]);

  // ── API helpers ───────────────────────────────────────────────────────────

 const fetchUsers = async () => {
  try {
    setUserLoading(true);
    const res = await GET("/api/users/");
    if (res?.status === 200) {
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.results || [];
      setUserList(data);
    }
  } catch {
    setUserList([]);
  } finally {
    setUserLoading(false);
  }
};

  const fetchLines = async (branchId) => {
    try {
      setLineLoading(true);
      const res = await GET(`api/line_dd/?branch_id=${branchId}`);
      if (res?.status === 200) {
        setLineList(res.data || []);
      } else {
        setLineList([]);
      }
    } catch {
      setLineList([]);
      notification.error({ message: "Error", description: "Failed to fetch line data." });
    } finally {
      setLineLoading(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const onFinish = async (values) => {
    setSubmitLoading(true);
    try {
      const payload = {
        investment_title: values.investment_title,
        multi_user_allocation: values.multi_user_allocation ?? false,
        entitled_to: values.multi_user_allocation ? null : (values.entitled_to || null),
        branch: selectedBranchId,
        line: values.line,
      };

      let response;
      if (params.id) {
        response = await PUT(`${INVESTMENT_TYPE_API}${params.id}/`, payload);
      } else {
        response = await POST(INVESTMENT_TYPE_API, payload);
      }

      if (response?.status === 200 || response?.status === 201) {
        notification.success({
          message: `${values.investment_title.toUpperCase()} Investment Type ${params.id ? "Updated" : "Created"}!`,
          description: params.id
            ? "Investment type has been updated successfully."
            : "Investment type has been created successfully.",
        });
        navigate("/investment-type");
      } else {
        // Surface backend validation errors
        const errData = response?.data || {};
        const errMsg =
          errData.branch_id?.[0] ||
          errData.line_id?.[0] ||
          errData.detail ||
          Object.values(errData).flat().join(", ") ||
          "Please try again.";
        notification.error({ message: "Operation Failed", description: errMsg });
      }
    } catch (error) {
      const errData = error?.response?.data || {};
      const errMsg =
        errData.branch_id?.[0] ||
        errData.line_id?.[0] ||
        errData.detail ||
        Object.values(errData).flat().join(", ") ||
        "An unexpected error occurred.";
      notification.error({ message: "Error", description: errMsg });
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Fragment>
      {loading && <Loader />}

      <div className="add-inv-type-page-content">
        <div className="add-inv-type-container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="add-inv-type-header">
                <h2 className="add-inv-type-title">
                  {params.id ? "Edit Investment Type" : "Add Investment Type"}
                </h2>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{ multi_user_allocation: false }}
                className="add-inv-type-form"
              >
                <div className="container add-inv-type-form-container">

                  {/* Row 1 – Title & Branch (read-only) */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Investment Title"
                        name="investment_title"
                        rules={[
                          { required: true, message: "Please enter investment title" },
                          {
                            pattern: /^[A-Za-z][A-Za-z0-9\-_ ]*$/,
                            message: "Must start with a letter; alphanumeric, dash, underscore, space allowed",
                          },
                        ]}
                      >
                        <InputWithAddon
                          icon={<TagOutlined />}
                          placeholder="Enter Investment Title"
                          size="large"
                          onValueFilter={(value) => {
                            if (!value) return "";
                            let filtered = "";
                            for (let i = 0; i < value.length; i++) {
                              if (i === 0) {
                                if (/[A-Za-z]/.test(value[i])) filtered += value[i];
                              } else {
                                if (/[A-Za-z0-9\-_ ]/.test(value[i])) filtered += value[i];
                              }
                            }
                            return filtered;
                          }}
                        />
                      </Form.Item>
                    </div>

                    <div className="col-md-6">
                      {/* Branch – derived from localStorage, display-only */}
                      <Form.Item label="Branch Name">
                        <InputWithAddon
                          icon={<BankOutlined />}
                          value={selectedBranchName}
                          disabled
                          size="large"
                          placeholder="Branch (from session)"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Row 2 – Line & Multi-User */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                     <Form.Item
  label="Line Name"
  name="line"
  rules={[{ required: true, message: "Please select a line" }]}
>
  <SelectWithAddon
    icon={lineLoading ? <Spin size="small" /> : <ApartmentOutlined />}
    placeholder={lineLoading ? "Loading lines…" : "Select Line"}
    allowClear
    showSearch
    size="large"
    disabled={lineLoading}
    filterOption={(input, option) =>
      option.children.toLowerCase().includes(input.toLowerCase())
    }
  >
    {lineList.map((line) => (
      <Option key={line.line_id} value={line.line_id}>
        {line.line_name}
      </Option>
    ))}
  </SelectWithAddon>
</Form.Item>
                    </div>

                    <div className="col-md-6">
                      <Form.Item
                        label="Multi-User Allocation"
                        name="multi_user_allocation"
                        valuePropName="checked"
                      >
                        <Switch
                          checked={multiUserAllocation}
                          onChange={(checked) => {
                            setMultiUserAllocation(checked);
                            form.setFieldsValue({ multi_user_allocation: checked });
                            if (checked) form.setFieldsValue({ entitled_to: undefined });
                          }}
                          checkedChildren="Yes"
                          unCheckedChildren="No"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Row 3 – Entitled To (only when multi_user_allocation = false) */}
                  {!multiUserAllocation && (
                    <div className="row mb-2">
                      <div className="col-md-6">
                        <Form.Item
  label="Entitled To"
  name="entitled_to"
>
  <SelectWithAddon
    icon={userLoading ? <Spin size="small" /> : <UserOutlined />}
    placeholder={userLoading ? "Loading users…" : "Select User"}
    allowClear
    showSearch
    size="large"
    disabled={userLoading}
    filterOption={(input, option) =>
      option.children.toLowerCase().includes(input.toLowerCase())
    }
  >
    {userList.map((user) => (
      <Option key={user.id} value={user.id}>
        {user.full_name ? `${user.full_name} | ${user.username}` : user.username}
      </Option>
    ))}
  </SelectWithAddon>
</Form.Item>
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="text-center mt-4">
                    <Space size="large">
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        loading={submitLoading}
                      >
                        {params.id ? "Update Investment Type" : "Add Investment Type"}
                      </Button>
                      <Button size="large" onClick={() => navigate("/investment-type")}>
                        Cancel
                      </Button>
                    </Space>
                  </div>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddInvestmentType;
