import React, { useEffect, useState } from "react";
import { Form, Select, Button, Card, Modal, message, Row, Col, Spin, Image } from "antd";
import { BankOutlined, ApartmentOutlined, UserOutlined } from "@ant-design/icons";
import { GET, POST } from "../../helpers/api_helper";
import { USERS } from "helpers/url_helper";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../../helpers/errorMessages";
import passwordIcon from "../../assets/icons/password (1).png";
import SelectWithAddon from "../../components/Common/SelectWithAddon";
import "./ResetPassword.css";

const { Option } = Select;

const RESET_PASSWORD_API = "/api";
const BRANCH_DD_API = "/api/branch_dd";
const LINE_DD_API = "/api/line_dd";

const ResetPassword = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [lines, setLines] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null); // { id, branch_name }

  // ─── On mount: load branches, then pre-select from localStorage ───────────
  useEffect(() => {
    fetchBranchesAndPreselect();
  }, []);

  const fetchBranchesAndPreselect = async () => {
    try {
      const response = await GET(BRANCH_DD_API);
      if (response?.status === 200 && response.data) {
        const branchData = Array.isArray(response.data) ? response.data : [];
        setBranches(branchData);

        // Read stored branch id and match with branch list
        const storedRaw = localStorage.getItem("selected_branch_id");
        if (storedRaw) {
          let storedId;
          try { storedId = JSON.parse(storedRaw); } catch { storedId = storedRaw; }
          storedId = Number(storedId);

          const matched = branchData.find((b) => b.id === storedId);
          if (matched) {
            setSelectedBranch(matched);
            form.setFieldsValue({ branch_name: matched.branch_name });
            fetchLines(matched.id);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch branches:", error);
      message.error("Failed to fetch branches.");
      setBranches([]);
    }
  };

  // ─── Fetch lines by branch_id (query param) ───────────────────────────────
  const fetchLines = async (branchId) => {
    try {
      setLineLoading(true);
      const response = await GET(`${LINE_DD_API}/?branch_id=${branchId}`);
      if (response?.status === 200 && response.data) {
        setLines(Array.isArray(response.data) ? response.data : []);
      } else {
        setLines([]);
      }
    } catch (error) {
      console.error("Failed to fetch lines:", error);
      message.error("Failed to fetch lines.");
      setLines([]);
    } finally {
      setLineLoading(false);
    }
  };

  // ─── Fetch users by branch + line ─────────────────────────────────────────
  const fetchUsers = async (branchName, lineName) => {
    try {
      setUserLoading(true);
      const response = await GET(
        `${USERS}?branch_name=${encodeURIComponent(branchName)}&line_name=${encodeURIComponent(lineName)}`
      );

      if (response?.status === 200 && response.data) {
        const userData = Array.isArray(response.data) ? response.data : [];

        const filteredUsers = userData.filter((user) => {
          const baseMatch =
            user.base_branch_name === branchName && user.base_line_name === lineName;
          const allocationMatch =
            user.line_allocations &&
            Array.isArray(user.line_allocations) &&
            user.line_allocations.some(
              (a) => a.branch_name === branchName && a.line_name === lineName
            );
          return baseMatch || allocationMatch;
        });

        const uniqueUsers = Array.from(
          new Map(
            filteredUsers.map((user) => [
              user.id,
              { id: user.id, name: user.username, full_name: user.full_name },
            ])
          ).values()
        );

        setUsers(uniqueUsers);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      message.error("Failed to fetch users.");
      setUsers([]);
    } finally {
      setUserLoading(false);
    }
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────

  // Branch is pre-selected and read-only; no change handler needed.
  // If you ever want to allow branch change, uncomment below:
  //
  // const handleBranchChange = (branchName) => {
  //   const branch = branches.find((b) => b.branch_name === branchName);
  //   setSelectedBranch(branch || null);
  //   form.setFieldsValue({ line_name: undefined, user_name: undefined });
  //   setLines([]);
  //   setUsers([]);
  //   if (branch) fetchLines(branch.id);
  // };

  const handleLineChange = (lineName) => {
    form.setFieldsValue({ user_name: undefined });
    setUsers([]);
    if (selectedBranch && lineName) {
      fetchUsers(selectedBranch.branch_name, lineName);
    }
  };

  // ─── Submit: only send user_id ────────────────────────────────────────────
  const handleSubmit = async (values) => {
    const selectedUser = users.find((u) => u.name === values.user_name);
    if (!selectedUser) {
      message.error("Selected user is invalid. Please re-select.");
      return;
    }

    Modal.confirm({
      title: "Confirm Password Reset",
      content: (
        <div>
          <p>Are you sure you want to reset the password for:</p>
          <p><strong>Branch:</strong> {values.branch_name}</p>
          <p><strong>Line:</strong> {values.line_name}</p>
          <p><strong>User:</strong> {values.user_name}</p>
        </div>
      ),
      okText: "Submit",
      cancelText: "Cancel",
      onOk: () => handlePasswordReset(selectedUser.id),
    });
  };

  const handlePasswordReset = async (userId) => {
    try {
      setLoading(true);

      // Only pass user_id in the request body
      const response = await POST(`${RESET_PASSWORD_API}/reset-password/`, {
        user_id: userId,
      });

      if (response?.status === 200 || response?.data?.message) {
        message.success(response?.data?.message || SUCCESS_MESSAGES.RESET_PASSWORD.SUCCESS);
        // Keep branch pre-selected; clear line and user
        form.setFieldsValue({ line_name: undefined, user_name: undefined });
        setLines([]);
        setUsers([]);
        // Re-fetch lines for the pre-selected branch
        if (selectedBranch) fetchLines(selectedBranch.id);
      } else {
        message.error(ERROR_MESSAGES.RESET_PASSWORD.RESET_FAILED);
      }
    } catch (error) {
      console.error("Password reset error:", error);
      const errMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        ERROR_MESSAGES.COMMON.UNKNOWN_ERROR;
      message.error(`${ERROR_MESSAGES.RESET_PASSWORD.RESET_FAILED}: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.setFieldsValue({ line_name: undefined, user_name: undefined });
    setLines([]);
    setUsers([]);
    if (selectedBranch) fetchLines(selectedBranch.id);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "0 0" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
        <Image src={passwordIcon} alt="Lock Icon" preview={false} width={30} height={30} />
        <h2 style={{ margin: "6px", fontSize: "20px", fontWeight: 600 }}>Reset User Password</h2>
      </div>

      <Card bordered={false} style={{ margin: 0, padding: 0, boxShadow: "none" }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
          <Row gutter={16}>

            {/* Branch — pre-selected & disabled */}
            <Col xs={24} sm={24} md={8}>
              <Form.Item
                label="Branch Name"
                name="branch_name"
                rules={[{ required: true, message: ERROR_MESSAGES.RESET_PASSWORD.BRANCH_REQUIRED }]}
              >
                <SelectWithAddon
                  icon={<BankOutlined />}
                  placeholder="Loading branch..."
                  disabled
                  showSearch
                >
                  {branches.map((branch) => (
                    <Option key={branch.id} value={branch.branch_name}>
                      {branch.branch_name}
                    </Option>
                  ))}
                </SelectWithAddon>
              </Form.Item>
            </Col>

            {/* Line — depends on pre-selected branch */}
            <Col xs={24} sm={24} md={8}>
              <Form.Item
                label="Line Name"
                name="line_name"
                rules={[{ required: true, message: ERROR_MESSAGES.RESET_PASSWORD.LINE_REQUIRED }]}
              >
                <SelectWithAddon
                  icon={<ApartmentOutlined />}
                  placeholder="Select Line"
                  onChange={handleLineChange}
                  disabled={!selectedBranch}
                  showSearch
                  loading={lineLoading}
                  notFoundContent={lineLoading ? <Spin size="small" /> : "No lines found"}
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {lines.map((line) => (
                    <Option key={line.line_id} value={line.line_name}>
                      {line.line_name}
                    </Option>
                  ))}
                </SelectWithAddon>
              </Form.Item>
            </Col>

            {/* User — depends on selected line */}
            <Col xs={24} sm={24} md={8}>
              <Form.Item
                label="User Name"
                name="user_name"
                rules={[{ required: true, message: ERROR_MESSAGES.RESET_PASSWORD.USER_REQUIRED }]}
              >
                <SelectWithAddon
                  icon={<UserOutlined />}
                  placeholder="Select User"
                  disabled={!form.getFieldValue("line_name")}
                  showSearch
                  loading={userLoading}
                  notFoundContent={userLoading ? <Spin size="small" /> : "No users found"}
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {users.map((user) => (
                    <Option key={user.id} value={user.name}>
                      {user.name}
                    </Option>
                  ))}
                </SelectWithAddon>
              </Form.Item>
            </Col>

          </Row>

          <Form.Item>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Button onClick={handleReset}>Clear</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Reset Password
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ResetPassword;