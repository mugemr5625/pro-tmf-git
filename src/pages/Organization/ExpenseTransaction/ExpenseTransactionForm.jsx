import ReloadOutlined from "@ant-design/icons/lib/icons/ReloadOutlined";
import { Button, Form, Input, Select, notification, Spin, Space } from "antd";
import { 
  ApartmentOutlined, 
  FileTextOutlined,
  CalendarOutlined,
  DollarOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import Loader from "components/Common/Loader";
import PAYMENT_MODES_OPTIONS from "constants/payment_modes";
import { POST, PUT, GET } from "helpers/api_helper";
import { getDetails } from "helpers/getters";
import {
  EXPENSE_TRANSACTION,
} from "helpers/url_helper";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import InputWithAddon from "components/Common/InputWithAddon";
import SelectWithAddon from "components/Common/SelectWithAddon";
import "./ExpenseTransactionForm.css";

const { Option } = Select;

const ExpenseTransactionForm = () => {
  const [form] = Form.useForm();

  const navigate = useNavigate();
  const params = useParams();

  const [loading, setLoading] = useState(false);
  const [expenseTypeList, setExpenseTypeList] = useState([]);
  const [expenseTypeLoader, setExpenseTypeLoader] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [selectedLineName, setSelectedLineName] = useState("");

  // ─── Read branch + line from localStorage ────────────────────────────────
  useEffect(() => {
    // Branch
    const storedBranchId = localStorage.getItem("selected_branch_id");
    if (storedBranchId) {
      try {
        setSelectedBranchId(parseInt(JSON.parse(storedBranchId)));
      } catch {
        setSelectedBranchId(parseInt(storedBranchId));
      }
    }

    // Line — set by ExpenseTransactionList search modal
    const storedLineId = localStorage.getItem("selected_line_id");
    const storedLineName = localStorage.getItem("selected_line_name");

    if (storedLineId) {
      const lineId = parseInt(storedLineId);
      setSelectedLineId(lineId);
      setSelectedLineName(storedLineName || "");
      // Auto-fetch expense types on create mode
      if (!params.id) {
        getExpenseTypeList(lineId);
      }
    }
  }, []);

  // ─── Fetch expense types by line_id ──────────────────────────────────────
  const getExpenseTypeList = async (lineId) => {
    try {
      setExpenseTypeLoader(true);
      setExpenseTypeList([]);
      form.setFieldsValue({ EXPNS_TYPE_ID: undefined });
      const response = await GET(`/api/expensetype_dd/?line_id=${lineId}`);
      if (response?.status === 200) {
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.results || [];
        setExpenseTypeList(data);
      } else {
        setExpenseTypeList([]);
      }
    } catch (error) {
      setExpenseTypeList([]);
      console.log(error);
      notification.error({
        message: "Error",
        description: "Failed to fetch expense types.",
        duration: 5,
      });
    } finally {
      setExpenseTypeLoader(false);
    }
  };

  // ─── Load edit details ────────────────────────────────────────────────────
  const getExpenseTransactionDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getDetails(EXPENSE_TRANSACTION, params.id);
      if (response) {
        // In edit mode, prefer line from saved record
        if (response.line_id) {
          setSelectedLineId(response.line_id);
          setSelectedLineName(
            response.line_name || localStorage.getItem("selected_line_name") || ""
          );
          await getExpenseTypeList(response.line_id);
        }
        form.setFieldsValue(response);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [params.id, form]);

  useEffect(() => {
    if (params.id && selectedBranchId) {
      getExpenseTransactionDetails();
    }
  }, [params.id, selectedBranchId]);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        line_id: selectedLineId,
        branch_id: selectedBranchId,
      };

      let response;
      if (params.id) {
        response = await PUT(`${EXPENSE_TRANSACTION}${params.id}/`, payload);
      } else {
        response = await POST(EXPENSE_TRANSACTION, payload);
      }

      if (response?.status === 200 || response?.status === 201) {
        const selectedExpenseType = expenseTypeList?.find(
          (type) => type.id === values.EXPNS_TYPE_ID
        );
        notification.success({
          message: `${selectedExpenseType?.name?.toUpperCase()} Expense Transaction ${
            params.id ? "Updated" : "Created"
          }!`,
          description: `Expense transaction has been ${
            params.id ? "updated" : "added"
          } successfully`,
          duration: 0,
        });
        navigate("/expense-transaction");
      } else if (response?.status === 400 || response?.status >= 500) {
        const errData = response?.data || {};
        const errMsg =
          errData.line_id?.[0] ||
          errData.EXPNS_TYPE_ID?.[0] ||
          errData.detail ||
          Object.values(errData).flat().join(", ") ||
          (params.id
            ? "Failed to update the expense transaction. Please try again."
            : "Failed to create the expense transaction. Please try again.");
        notification.error({
          message: `Failed to ${params.id ? "update" : "add"} expense transaction`,
          description: errMsg,
          duration: 0,
        });
      }
    } catch (error) {
      console.log(error);
      notification.error({
        message: "An error occurred",
        description: "Failed to process expense transaction",
        duration: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Derived state ────────────────────────────────────────────────────────
  const isExpenseTypeDisabled = expenseTypeLoader || !selectedLineId;

  return (
    <>
      {loading && <Loader />}

      <div className="expense-transaction-page-content">
        <div className="expense-transaction-container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="expense-transaction-header">
                <h2 className="expense-transaction-title">
                  {params.id ? "Edit Expense Transaction" : "Add Expense Transaction"}
                </h2>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                className="expense-transaction-form"
              >
                <div className="container expense-transaction-form-container">

                  {/* Row 1: Line Name (disabled, from localStorage) + Expense Type */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item label="Line Name">
                        <InputWithAddon
                          icon={<ApartmentOutlined />}
                          value={selectedLineName || "No line selected"}
                          disabled
                          style={{
                            backgroundColor: '#f5f5f5',
                            cursor: 'not-allowed',
                            color: selectedLineName ? '#000' : '#999',
                          }}
                        />
                      </Form.Item>
                    </div>

                    <div className="col-md-6">
                      <Form.Item
                        label="Expense Type Name"
                        name="EXPNS_TYPE_ID"
                        rules={[
                          {
                            required: true,
                            message: "Please select an expense type",
                          },
                        ]}
                      >
                        <SelectWithAddon
                          icon={expenseTypeLoader ? <Spin size="small" /> : <FileTextOutlined />}
                          placeholder={
                            expenseTypeLoader
                              ? "Loading expense types..."
                              : !selectedLineId
                              ? "No line selected"
                              : expenseTypeList.length === 0
                              ? "No expense types available"
                              : "Select Expense Type"
                          }
                          allowClear
                          showSearch
                          size="large"
                          disabled={isExpenseTypeDisabled}
                          filterOption={(input, option) =>
                            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                          }
                        >
                          {expenseTypeList?.map((type) => (
                            <Option key={type.id} value={type.id}>
                              {type.name}
                            </Option>
                          ))}
                        </SelectWithAddon>
                      </Form.Item>
                    </div>
                  </div>

                  {/* Row 2: Date + Expense Amount */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Date of Expense Transaction"
                        name="EXPNS_TRNSCTN_DT"
                        rules={[
                          { required: true, message: "Please select a date" },
                        ]}
                      >
                        <InputWithAddon
                          icon={<CalendarOutlined />}
                          type="date"
                          autoComplete="off"
                          onPaste={(e) => e.preventDefault()}
                          onCopy={(e) => e.preventDefault()}
                          onCut={(e) => e.preventDefault()}
                          onContextMenu={(e) => e.preventDefault()}
                          onDrop={(e) => e.preventDefault()}
                          size="large"
                          allowClear
                        />
                      </Form.Item>
                    </div>

                    <div className="col-md-6">
                      <Form.Item
                        label="Expense Amount"
                        name="EXPNS_TRNSCTN_AMNT"
                        rules={[
                          { required: true, message: "Please enter an amount" },
                          {
                            pattern: /^[0-9]+(\.[0-9]{1,2})?$/,
                            message: "Enter a valid amount",
                          },
                        ]}
                      >
                        <InputWithAddon
                          icon={<DollarOutlined />}
                          placeholder="Enter Expense Amount"
                          type="text"
                          inputMode="decimal"
                          onValueFilter={(value) => {
                            let filtered = value.replace(/[^0-9.]/g, '');
                            const parts = filtered.split('.');
                            if (parts.length > 2) {
                              filtered = parts[0] + '.' + parts.slice(1).join('');
                            }
                            if (parts.length === 2 && parts[1].length > 2) {
                              filtered = parts[0] + '.' + parts[1].slice(0, 2);
                            }
                            return filtered;
                          }}
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Row 3: Payment Mode + Remarks */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Payment Mode"
                        name="EXPNS_TRNSCTN_MODE"
                        rules={[
                          {
                            required: true,
                            message: "Please select a payment mode",
                          },
                        ]}
                      >
                        <SelectWithAddon
                          icon={<CreditCardOutlined />}
                          placeholder="Select Payment Mode"
                          allowClear
                          size="large"
                        >
                          {PAYMENT_MODES_OPTIONS.map((mode) => (
                            <Option key={mode.value} value={mode.value}>
                              {mode.label}
                            </Option>
                          ))}
                        </SelectWithAddon>
                      </Form.Item>
                    </div>

                    <div className="col-md-6">
                      <Form.Item
                        label="Remarks / Comments"
                        name="EXPNS_TRNSCTN_RMRK"
                      >
                        <Input.TextArea
                          placeholder="Enter remarks or comments"
                          autoSize={{ minRows: 2, maxRows: 6 }}
                          size="large"
                          allowClear
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="text-center mt-4">
                    <Space size="large">
                      <Button type="primary" htmlType="submit" size="large">
                        {params.id ? "Update Transaction" : "Add Transaction"}
                      </Button>
                      <Button
                        size="large"
                        onClick={() => navigate("/expense-transaction")}
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

export default ExpenseTransactionForm;