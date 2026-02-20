import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { notification, Form, Spin, Button, Select, Space } from "antd";
import { ToastContainer } from "react-toastify";
import Loader from "components/Common/Loader";
import { GET, POST, PUT } from "helpers/api_helper";
import { EXPENSE_TYPE_DETAIL, EXPENSE_TYPES } from "helpers/url_helper";
import InputWithAddon from "components/Common/InputWithAddon";
import SelectWithAddon from "components/Common/SelectWithAddon";
import { 
    BankOutlined, 
    ApartmentOutlined, 
    DollarOutlined,
    CheckCircleOutlined 
} from '@ant-design/icons';

const { Option } = Select;

const AddExpense = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const { id } = useParams();
    const [isEditMode, setIsEditMode] = useState(false);
    const [branches, setBranches] = useState([]);
    const [lines, setLines] = useState([]);
    const [allLines, setAllLines] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [branchLoading, setBranchLoading] = useState(false);
    const [lineLoading, setLineLoading] = useState(false);

    // Fetch branches from branch_dd API
    const fetchBranches = useCallback(async () => {
        setBranchLoading(true);
        try {
            const response = await GET("api/branch_dd");
            if (response.status === 200) {
                setBranches(response.data || []);
            } else {
                notification.error({
                    message: "Error",
                    description: "Failed to load branches.",
                });
            }
        } catch (error) {
            notification.error({
                message: "Error",
                description: "Failed to load branches.",
            });
        } finally {
            setBranchLoading(false);
        }
    }, []);

    // Fetch lines from line_dd API
    const fetchLines = useCallback(async () => {
        setLineLoading(true);
        try {
            const response = await GET("api/line_dd");
            if (response.status === 200) {
                setAllLines(response.data || []);
            } else {
                notification.error({
                    message: "Error",
                    description: "Failed to load lines.",
                });
            }
        } catch (error) {
            notification.error({
                message: "Error",
                description: "Failed to load lines.",
            });
        } finally {
            setLineLoading(false);
        }
    }, []);

    // Get lines for selected branch from line_dd data
    const getLinesForBranch = useCallback((branchId) => {
        const branchLines = allLines.filter(line => line.branch_id === branchId);
        setLines(branchLines);
    }, [allLines]);

    // Fetch expense data for editing
    const fetchExpenseData = useCallback(async (expenseId) => {
        setLoading(true);
        try {
            const response = await GET(EXPENSE_TYPE_DETAIL(expenseId));
            if (response.status === 200) {
                const { data } = response;
                form.setFieldsValue({
                    name: data.name,
                    branch_id: data.branch_id,
                    line_id: data.line_id,
                    status: data.status,
                });
                
                // Set selected branch and get lines
                if (data.branch_id) {
                    setSelectedBranch(data.branch_id);
                    getLinesForBranch(data.branch_id);
                }
            } else {
                notification.error({
                    message: "Error",
                    description: "Failed to load expense data.",
                });
            }
        } catch (error) {
            notification.error({
                message: "Error",
                description: "Failed to load expense data.",
            });
        } finally {
            setLoading(false);
        }
    }, [form, getLinesForBranch]);

    useEffect(() => {
        fetchBranches();
        fetchLines();
    }, [fetchBranches, fetchLines]);

    useEffect(() => {
        if (id && allLines.length > 0) {
            setIsEditMode(true);
            fetchExpenseData(id);
        }
    }, [id, allLines, fetchExpenseData]);

    // Handle branch selection change
    const handleBranchChange = (branchId) => {
        setSelectedBranch(branchId);
        form.setFieldsValue({ line_id: undefined }); // Reset line selection
        setLines([]); // Clear lines
        if (branchId) {
            getLinesForBranch(branchId);
        }
    };

  const onFinish = async (values) => {
    setLoading(true);
    try {
        const expenseData = {
            name: values.name,
            branch_id: values.branch_id,
            line_id: values.line_id,
            status: values.status,
        };

        console.log("Submitting expense data:", expenseData);

        if (isEditMode) {
            const existingExpense = await GET(EXPENSE_TYPE_DETAIL(id));

            if (existingExpense.status === 200) {
                if (
                    existingExpense.data.name === values.name &&
                    existingExpense.data.branch_id === values.branch_id &&
                    existingExpense.data.line_id === values.line_id &&
                    existingExpense.data.status === values.status
                ) {
                    notification.warning({
                        message: "No Changes",
                        description: "No changes detected, update not required.",
                    });
                    setLoading(false);
                    return;
                }

                const response = await PUT(EXPENSE_TYPE_DETAIL(id), expenseData);
                
                if (response.status === 200 || response.status === 201) {
                    notification.success({
                        message: "Expense Type Updated!",
                        description: "The expense type has been updated successfully",
                        duration: 2,
                    });
                    navigate("/expense/list");
                } else {
                    throw new Error(`Unexpected status: ${response.status}`);
                }
            }
        } else {
            const response = await POST(EXPENSE_TYPES, expenseData);
            console.log("POST Response status:", response.status);
            console.log("POST Response data:", response.data);
            
            // Check for both 200 and 201 status codes
            if (response.status === 200 || response.status === 201) {
                notification.success({
                    message: "Expense Type Added!",
                    description: "The expense type has been added successfully",
                    duration: 2,
                });
                navigate("/expense/list");
            } else {
                // Even if response exists but status is not 200/201
                throw new Error(`Unexpected response status: ${response.status}`);
            }
        }
    } catch (error) {
        console.error("=== ERROR DETAILS ===");
        console.error("Full error:", error);
        console.error("Error response:", error.response);
        console.error("Error response data:", error.response?.data);
        console.error("Error response status:", error.response?.status);
        console.error("=====================");
        
        if (error.response?.data) {
            const errorData = error.response.data;
            
            // Handle field-specific errors
            if (errorData.name) {
                notification.error({
                    message: "Validation Error",
                    description: Array.isArray(errorData.name) ? errorData.name[0] : errorData.name,
                    duration: 5,
                });
            } else if (errorData.branch_id) {
                notification.error({
                    message: "Branch Error",
                    description: Array.isArray(errorData.branch_id) ? errorData.branch_id[0] : errorData.branch_id,
                    duration: 5,
                });
            } else if (errorData.line_id) {
                notification.error({
                    message: "Line Error",
                    description: Array.isArray(errorData.line_id) ? errorData.line_id[0] : errorData.line_id,
                    duration: 5,
                });
            } else {
                // Generic error message
                const errorMsg = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
                notification.error({
                    message: "Error",
                    description: errorMsg,
                    duration: 5,
                });
            }
        } else {
            notification.error({
                message: "Error",
                description: error.message || "An error occurred while processing your request.",
                duration: 5,
            });
        }
    } finally {
        setLoading(false);
    }
};

    return (
        <>
            {loading && <Loader />}

            <div className="page-content" style={{
                marginRight: "10px",
                marginLeft: "-10px",
                maxWidth: "100%"
            }}>
                <div className="container-fluid" style={{
                    marginTop: -100,
                    padding: 0,
                }}>
                    <div className="row">
                        <div className="col-md-12">
                            <h2 className="expense-transaction-title" style={{ margin: 0, fontSize: "24px", fontWeight: 600 }}>
                                {isEditMode ? "Edit Expense Type" : "Add Expense Type"}
                            </h2>

                            <Form
                                form={form}
                                layout="vertical"
                                className="expense-transaction-form"  
                                onFinish={onFinish}
                                style={{ padding: 0, marginRight: "-20px", marginBottom: "-30px", marginTop: '10px' }}
                            >
                                <div className="container" style={{ padding: 0 }}>
                                    {/* Branch and Line Selection */}
                                    <div className="row mb-3">
                                        <div className="col-md-6">
  <Form.Item
    label="Branch Name"
    name="branch_id"
    rules={[{ required: true, message: "Please select a branch" }]}
  >
    <SelectWithAddon
      icon={branchLoading ? <Spin size="small" /> : <BankOutlined />}
      placeholder={branchLoading ? "Loading branch..." : "Select branch"}
      size="large"
      onChange={handleBranchChange}
      showSearch
      filterOption={(input, option) =>
        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
      }
      notFoundContent={branchLoading ? <Spin size="small" /> : "No branches"}
    >
      {branches.map((branch) => (
        <Option key={branch.id} value={branch.id}>
          {branch.branch_name}
        </Option>
      ))}
    </SelectWithAddon>
  </Form.Item>
</div>
                                        <div className="col-md-6">
  <Form.Item
    label="Line Name"
    name="line_id"
    rules={[{ required: true, message: "Please select a line" }]}
  >
    <SelectWithAddon
      icon={branchLoading || lineLoading ? <Spin size="small" /> : <ApartmentOutlined />}
      placeholder={
        branchLoading
          ? "Loading branch..."
          : lineLoading
          ? "Loading lines..."
          : !selectedBranch
          ? "Select a branch first"
          : "Select line"
      }
      size="large"
      disabled={branchLoading || lineLoading || !selectedBranch}
      showSearch
      filterOption={(input, option) =>
        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
      }
      notFoundContent={lineLoading ? <Spin size="small" /> : "No lines"}
      style={{
        backgroundColor: !selectedBranch ? '#f5f5f5' : '#ffffff',
      }}
    >
      {lines.map((line) => (
        <Option key={line.line_id} value={line.line_id}>
          {line.line_name}
        </Option>
      ))}
    </SelectWithAddon>
  </Form.Item>
</div>
                                    </div>

                                    {/* Expense Details */}
                                   <div className="row mb-1 mt-2">
    <div className="col-md-6">
        <Form.Item
            label="Expense Name"
            name="name"
            rules={[
                { required: true, message: "Please enter expense name" },
                { 
                    pattern: /^[A-Za-z][A-Za-z0-9\s-]*$/, 
                    message: 'Expense name must start with an alphabet and can contain alphabets, numbers, spaces, and hyphens' 
                }
            ]}
        >
            <InputWithAddon
                icon={<DollarOutlined />}
                placeholder="Enter expense name"
                size="large"
                onValueFilter={(value) => {
                    if (value.length === 0) return '';
                    
                    // First character must be alphabet
                    let filtered = '';
                    for (let i = 0; i < value.length; i++) {
                        if (i === 0) {
                            // First character: only alphabets
                            if (/[A-Za-z]/.test(value[i])) {
                                filtered += value[i];
                            }
                        } else {
                            // Subsequent characters: alphabets, numbers, spaces, and hyphens
                            if (/[A-Za-z0-9\s-]/.test(value[i])) {
                                filtered += value[i];
                            }
                        }
                    }
                    return filtered;
                }}
            />
        </Form.Item>
    </div>
                                        <div className="col-md-6">
                                            <Form.Item
                                                label="Status"
                                                name="status"
                                                rules={[{ required: true, message: "Please select a status" }]}
                                            >
                                                <SelectWithAddon
                                                    icon={<CheckCircleOutlined />}
                                                    placeholder="Select status"
                                                    size="large"
                                                >
                                                    <Option value="active">Active</Option>
                                                    <Option value="inactive">Inactive</Option>
                                                </SelectWithAddon>
                                            </Form.Item>
                                        </div>
                                    </div>

                                    {/* Submit & Cancel Buttons */}
                                    <div className="text-center mt-4">
                                        <Space size="large">
                                            <Button
                                                type="primary"
                                                htmlType="submit"
                                                size="large"
                                                loading={loading}
                                            >
                                                {isEditMode ? "Update Expense Type" : "Add Expense Type"}
                                            </Button>
                                            <Button
                                                size="large"
                                                onClick={() => navigate("/expense/list")}
                                                disabled={loading}
                                            >
                                                Cancel
                                            </Button>
                                        </Space>
                                    </div>
                                </div>
                            </Form>
                        </div>
                    </div>
                </div>
                <ToastContainer />
            </div>
        </>
    );
};

export default AddExpense;