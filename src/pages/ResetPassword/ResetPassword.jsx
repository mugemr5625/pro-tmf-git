import React, { useEffect, useState } from "react";
import { Form, Select, Button, Card, Modal, message, Row, Col, Spin, Image, notification } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { GET, POST } from "../../helpers/api_helper";
import { USERS } from "helpers/url_helper";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../../helpers/errorMessages";
import passwordIcon from "../../assets/icons/password (1).png";
import SelectWithAddon from "../../components/Common/SelectWithAddon";
import "./ResetPassword.css";

const { Option } = Select;

const RESET_PASSWORD_API = "/api";

const ResetPassword = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [users, setUsers] = useState([]);

  // Fetch all users on mount
  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      setUserLoading(true);
      const response = await GET(USERS);
      if (response?.status === 200 && response.data) {
        const userData = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];

        const uniqueUsers = Array.from(
          new Map(
            userData.map((user) => [
              user.id,
              { id: user.id, name: user.username, full_name: user.full_name },
            ])
          ).values()
        );
        setUsers(uniqueUsers);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      notification.error({
        message: "Error",
        description: "Failed to fetch users.",
        duration: 5,
      });
      setUsers([]);
    } finally {
      setUserLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    const selectedUser = users.find((u) => u.name === values.user_name);
    if (!selectedUser) {
      notification.error({
        message: "Invalid User",
        description: "Selected user is invalid. Please re-select.",
        duration: 5,
      });
      return;
    }

    Modal.confirm({
      title: "Confirm Password Reset",
      content: (
        <div>
          <p>Are you sure you want to reset the password for:</p>
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
      const response = await POST(`${RESET_PASSWORD_API}/reset-password/`, {
        user_id: userId,
      });

      if (response?.status === 200 || response?.data?.message) {
        notification.success({
          message: "Success",
          description: response?.data?.message || SUCCESS_MESSAGES.RESET_PASSWORD.SUCCESS,
          duration: 5,
        });
        form.resetFields();
      } else {
        notification.error({
          message: "Reset Failed",
          description: ERROR_MESSAGES.RESET_PASSWORD.RESET_FAILED,
          duration: 5,
        });
      }
    } catch (error) {
      console.error("Password reset error:", error);
      const errMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        ERROR_MESSAGES.COMMON.UNKNOWN_ERROR;
      notification.error({
        message: "Reset Failed",
        description: `${ERROR_MESSAGES.RESET_PASSWORD.RESET_FAILED}: ${errMsg}`,
        duration: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
  };

  return (
    <div style={{ padding: "0 0" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
        <Image src={passwordIcon} alt="Lock Icon" preview={false} width={30} height={30} />
        <h2 style={{ margin: "6px", fontSize: "20px", fontWeight: 600 }}>Reset User Password</h2>
      </div>

      <Card bordered={false} style={{ margin: 0, padding: 0, boxShadow: "none" }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
          <Row gutter={16}>
            <Col xs={24} sm={24} md={8}>
              <Form.Item
                label="User Name"
                name="user_name"
                rules={[{ required: true, message: ERROR_MESSAGES.RESET_PASSWORD.USER_REQUIRED }]}
              >
                <SelectWithAddon
                  icon={userLoading ? <Spin size="small" /> : <UserOutlined />}
                  placeholder={userLoading ? "Loading users..." : "Select User"}
                  showSearch
                  disabled={userLoading}
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