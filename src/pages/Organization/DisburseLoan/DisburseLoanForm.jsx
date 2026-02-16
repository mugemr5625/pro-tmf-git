import {
  Form,
  Input,
  DatePicker,
  InputNumber,
  Button,
  Divider,
  Space,
  notification,
  Alert,
  Card,
  Grid,
  Select
} from "antd";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  DISBURSE_LOAN,
  CUSTOMERS,
} from "helpers/url_helper";
import { getDetails, getList } from "helpers/getters";
import { Fragment, useState, useEffect, useCallback } from "react";
import Loader from "components/Common/Loader";
import { 
  ReloadOutlined, 
  CalendarOutlined,
  UserOutlined,
  SyncOutlined,
  DollarOutlined,
  PercentageOutlined,
  NumberOutlined,
  FieldTimeOutlined,
  WalletOutlined,
  CreditCardOutlined,
  BankOutlined,
  ApartmentOutlined,
  EnvironmentOutlined,
  CommentOutlined,
} from "@ant-design/icons";
import { POST, PUT } from "helpers/api_helper";
import { devLog } from "../../../utils/environment";
import SelectWithAddon from "components/Common/SelectWithAddon";
import InputWithAddon from "components/Common/InputWithAddon";
import './DisburseLoanForm.css';

const { TextArea } = Input;

const DisburseLoanForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const [customerList, setCustomerList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState(null);
  const [apiError, setApiError] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Online");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [branchId, setBranchId] = useState(null);
  const [lineId, setLineId] = useState(null);
  const [areaId, setAreaId] = useState(null);
  const [branchName, setBranchName] = useState("");
  const [lineName, setLineName] = useState("");
  const [areaName, setAreaName] = useState("");
  const [createdBy, setCreatedBy] = useState(null);
  const [updatedBy, setUpdatedBy] = useState(null);

  // Get data from navigation state
  const navigationState = location.state || {};
  const { mode, customerId, customerName, loanData } = navigationState;

  const loadCustomerData = useCallback(async () => {
    try {
      setCustomerList(null);
      const customers = await getList(CUSTOMERS);
      devLog("Customer list loaded:", customers);
      setCustomerList(customers);
    } catch (error) {
      console.error("Error loading customer list:", error);
      setApiError(true);
    }
  }, []);

  useEffect(() => {
    // Determine mode from URL params and navigation state
    if (params.mode === 'edit' || mode === 'edit' || (params.id && params.id !== 'add')) {
      setIsEditMode(true);
      setIsAddMode(false);
    } else if (params.mode === 'add' || mode === 'add' || params.id === 'add') {
      setIsAddMode(true);
      setIsEditMode(false);
    }
    
    // Set customer name if provided from navigation
    if (customerName) {
      setSelectedCustomerName(customerName);
    }
    
    // Set branch, line, and area IDs from navigation state
    if (navigationState.branchId) {
      setBranchId(navigationState.branchId);
    }
    if (navigationState.lineId) {
      setLineId(navigationState.lineId);
    }
    if (navigationState.areaId) {
      setAreaId(navigationState.areaId);
    }
    if (navigationState.branchName) {
      setBranchName(navigationState.branchName);
    }
    if (navigationState.lineName) {
      setLineName(navigationState.lineName);
    }
    if (navigationState.areaName) {
      setAreaName(navigationState.areaName);
    }
    
    loadCustomerData();
  }, [params.mode, params.id, mode, customerName, navigationState, loadCustomerData]);

  // Load loan data if in edit mode
  useEffect(() => {
    // Only fetch loan details if we're in edit mode AND have a valid numeric loan ID
    if (isEditMode && params.id && params.id !== 'add' && !isNaN(params.id)) {
      setLoading(true);
      getDetails(DISBURSE_LOAN, params.id)
        .then((res) => {
          devLog("Loan details loaded:", res);
          setLoan(res);
          setPaymentMode(res.loan_dsbrsmnt_mode || "Online");
          
          // Save the IDs and names
          setBranchId(res.loan_dsbrsmnt_brnch_id);
          setLineId(res.loan_dsbrsmnt_line_id);
          setAreaId(res.loan_dsbrsmnt_area_id);
          setBranchName(res.branch_name || "");
          setLineName(res.line_name || "");
          setAreaName(res.area_name || "");
          setCreatedBy(res.loan_dsbrsmnt_created_by);
          setUpdatedBy(res.loan_dsbrsmnt_updtd_by);
          
          // Populate form with loan data
          form.setFieldsValue({
            loan_dsbrsmnt_cust_id: res.loan_dsbrsmnt_cust_id,
            loan_dsbrsmnt_dt: res.loan_dsbrsmnt_dt || "",
            loan_dsbrsmnt_repmnt_type: res.loan_dsbrsmnt_repmnt_type,
            loan_dsbrsmnt_amnt: res.loan_dsbrsmnt_amnt,
            loan_dsbrsmnt_intrst_amnt: res.loan_dsbrsmnt_intrst_amnt,
            loan_dsbrsmnt_tot_instlmnt: res.loan_dsbrsmnt_tot_instlmnt,
            loan_dsbrsmnt_prcsng_fee_amnt: res.loan_dsbrsmnt_prcsng_fee_amnt,
            loan_dsbrsmnt_instlmnt_amnt: res.loan_dsbrsmnt_instlmnt_amnt,
            loan_dsbrsmnt_dflt_pay_amnt: res.loan_dsbrsmnt_dflt_pay_amnt,
            loan_dsbrsmnt_bad_loan_days: res.loan_dsbrsmnt_bad_loan_days,
            loan_dsbrsmnt_mode: res.loan_dsbrsmnt_mode,
            loan_dsbrsmnt_comnt: res.loan_dsbrsmnt_comnt,
            loan_dsbrsmnt_online_amnt: res.loan_dsbrsmnt_online_amnt,
            loan_dsbrsmnt_cash_amnt: res.loan_dsbrsmnt_cash_amnt,
            loan_dsbrsmnt_online_remarks: res.loan_dsbrsmnt_online_remarks,
            loan_dsbrsmnt_cash_remarks: res.loan_dsbrsmnt_cash_remarks,
          });
          
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching loan details:", error);
          notification.error({
            message: "Failed to load loan details",
            description: "Please try again later.",
          });
          setLoading(false);
        });
    } else if (isAddMode && customerId) {
      // Pre-fill customer ID for add mode
      setLoading(true);
      
      // Wait for customer list to load before setting the value
      const checkCustomerList = setInterval(() => {
        if (customerList && customerList.length > 0) {
          clearInterval(checkCustomerList);
          form.setFieldsValue({
            loan_dsbrsmnt_cust_id: customerId,
          });
          setLoading(false);
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkCustomerList);
        if (loading) {
          form.setFieldsValue({
            loan_dsbrsmnt_cust_id: customerId,
          });
          setLoading(false);
        }
      }, 5000);
    } else {
      setLoading(false);
    }
  }, [isEditMode, isAddMode, params.id, customerId, form, customerList]);

  // Update customer name when customer is selected or loaded
  useEffect(() => {
    const formCustomerId = form.getFieldValue('loan_dsbrsmnt_cust_id');
    if (formCustomerId && customerList) {
      const customer = customerList.find(c => c.id === formCustomerId);
      if (customer) {
        const name = customer.customer_name || customer.customer_nm;
        setSelectedCustomerName(name);
      }
    }
  }, [form.getFieldValue('loan_dsbrsmnt_cust_id'), customerList]);

  const calculateAmountPerInstallment = () => {
    const loanAmount = form.getFieldValue("loan_dsbrsmnt_amnt") || 0;
    const interestAmount = form.getFieldValue("loan_dsbrsmnt_intrst_amnt") || 0;
    const processingFee = form.getFieldValue("loan_dsbrsmnt_prcsng_fee_amnt") || 0;
    const numberOfInstallments = form.getFieldValue("loan_dsbrsmnt_tot_instlmnt") || 1;

    const totalAmount = loanAmount + interestAmount + processingFee;
    const amountPerInstallment = totalAmount / numberOfInstallments;

    form.setFieldsValue({
      loan_dsbrsmnt_instlmnt_amnt: amountPerInstallment.toFixed(2),
      loan_dsbrsmnt_dflt_pay_amnt: amountPerInstallment.toFixed(2),
    });
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const formData = {
        // Required IDs
        loan_dsbrsmnt_brnch_id: branchId,
        loan_dsbrsmnt_line_id: lineId,
        loan_dsbrsmnt_area_id: areaId,
        loan_dsbrsmnt_cust_id: values.loan_dsbrsmnt_cust_id,
        
        // Form values
        loan_dsbrsmnt_dt: values.loan_dsbrsmnt_dt,
        loan_dsbrsmnt_repmnt_type: values.loan_dsbrsmnt_repmnt_type,
        loan_dsbrsmnt_amnt: values.loan_dsbrsmnt_amnt,
        loan_dsbrsmnt_intrst_amnt: values.loan_dsbrsmnt_intrst_amnt,
        loan_dsbrsmnt_tot_instlmnt: values.loan_dsbrsmnt_tot_instlmnt,
        loan_dsbrsmnt_prcsng_fee_amnt: values.loan_dsbrsmnt_prcsng_fee_amnt,
        loan_dsbrsmnt_instlmnt_amnt: values.loan_dsbrsmnt_instlmnt_amnt,
        loan_dsbrsmnt_dflt_pay_amnt: values.loan_dsbrsmnt_dflt_pay_amnt,
        loan_dsbrsmnt_bad_loan_days: values.loan_dsbrsmnt_bad_loan_days,
        loan_dsbrsmnt_mode: values.loan_dsbrsmnt_mode,
        loan_dsbrsmnt_comnt: values.loan_dsbrsmnt_comnt || "",
      };

      // Add payment mode specific fields
      if (values.loan_dsbrsmnt_mode === "Both") {
        formData.loan_dsbrsmnt_online_amnt = values.loan_dsbrsmnt_online_amnt;
        formData.loan_dsbrsmnt_cash_amnt = values.loan_dsbrsmnt_cash_amnt;
        formData.loan_dsbrsmnt_online_remarks = values.loan_dsbrsmnt_online_remarks || "";
        formData.loan_dsbrsmnt_cash_remarks = values.loan_dsbrsmnt_cash_remarks || "";
      }

      // Validate required fields
      if (!formData.loan_dsbrsmnt_brnch_id || !formData.loan_dsbrsmnt_line_id || !formData.loan_dsbrsmnt_area_id) {
        notification.error({
          message: "Missing Required Information",
          description: "Branch, Line, and Area information is required. Please try navigating from the list page again.",
        });
        setLoading(false);
        return;
      }

      let response;
      if (isEditMode && params.id) {
        response = await PUT(`${DISBURSE_LOAN}${params.id}/`, formData);
      } else {
        response = await POST(DISBURSE_LOAN, formData);
      }

      if (response?.status === 200 || response?.status === 201) {
        notification.success({
          message: `Loan disbursement ${isEditMode ? "updated" : "created"} successfully!`,
          description: `Loan for ${selectedCustomerName} has been ${isEditMode ? "updated" : "created"}.`,
        });
        navigate("/disburse-loan");
      } else {
        console.error("API response error:", response);
        notification.error({
          message: `Failed to ${isEditMode ? "update" : "create"} loan disbursement`,
          description: response?.data?.message || "Please check your input and try again.",
        });
      }
    } catch (error) {
      console.error(error);
      notification.error({
        message: "An error occurred while saving the loan disbursement",
        description: error.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loanRepaymentTypes = [
    { label: "Daily", value: "Daily" },
    { label: "Weekly", value: "Weekly" },
    { label: "Monthly", value: "Monthly" },
  ];

  const paymentModes = [
    { label: "Cash", value: "Cash" },
    { label: "Online", value: "Online" },
    { label: "Both", value: "Both" },
  ];

  const handlePaymentModeChange = (value) => {
    setPaymentMode(value);
    
    if (value !== "Both") {
      form.setFieldsValue({
        loan_dsbrsmnt_online_amnt: undefined,
        loan_dsbrsmnt_cash_amnt: undefined,
        loan_dsbrsmnt_online_remarks: undefined,
        loan_dsbrsmnt_cash_remarks: undefined,
      });
    }
  };

  const handleCustomerChange = (customerId) => {
    const customer = customerList?.find(c => c.id === customerId);
    if (customer) {
      setSelectedCustomerName(customer.customer_name || customer.customer_nm);
    } else {
      setSelectedCustomerName("");
    }
  };

  const handleReset = () => {
    form.resetFields();
    setSelectedCustomerName("");
    setPaymentMode("Online");
  };

  if (loading && customerList === null) {
    return (
      <div className="loan-form-page-content">
        <div className="loan-form-container-fluid">
          <div className="row">
            <div className="col-md-12">
              <Card>
                <div
                  className="d-flex justify-content-center align-items-center"
                  style={{ minHeight: "400px" }}
                >
                  <div className="text-center">
                    <Loader />
                    <p className="mt-3 text-muted">
                      Loading loan disbursement form...
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="loan-form-page-content">
        <div className="loan-form-container-fluid">
          <div className="row">
            <div className="col-md-12">
              <Card>
                <div
                  className="d-flex justify-content-center align-items-center"
                  style={{ minHeight: "400px" }}
                >
                  <div className="text-center">
                    <Alert
                      message="Connection Error"
                      description="Unable to load the required data. Please check your internet connection and try again."
                      type="error"
                      showIcon
                      className="mb-4"
                    />
                    <Space>
                      <Button
                        type="primary"
                        onClick={() => window.location.reload()}
                        icon={<ReloadOutlined />}
                      >
                        Retry
                      </Button>
                      <Button onClick={() => navigate("/disburse-loan")}>
                        Go Back
                      </Button>
                    </Space>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Fragment>
      <div className="loan-form-page-content">
        <div className="loan-form-container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="loan-form-header">
                <h2 className="loan-form-title">
                  {isEditMode ? "Edit Loan" : "Add New Loan"}
                </h2>
              </div>

              <div className="loan-form-wrapper">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={onFinish}
                  className="loan-disbursement-form"
                  onValuesChange={(changedValues) => {
                    if (
                      changedValues.loan_dsbrsmnt_amnt ||
                      changedValues.loan_dsbrsmnt_intrst_amnt ||
                      changedValues.loan_dsbrsmnt_prcsng_fee_amnt ||
                      changedValues.loan_dsbrsmnt_tot_instlmnt
                    ) {
                      calculateAmountPerInstallment();
                    }
                  }}
                >
                  <div className="loan-form-container">
                    {/* Customer and Date Row */}
                    <div className="row mb-2">
                      <div className="col-md-6">
                        <Form.Item label="Customer Name">
                          <InputWithAddon
                            icon={<UserOutlined style={{ color: '#1890ff' }} />}
                            value={selectedCustomerName}
                            placeholder="Customer Name"
                            disabled
                            style={{
                              backgroundColor: '#f5f5f5',
                              color: '#262626',
                              fontWeight: '500',
                              cursor: 'not-allowed'
                            }}
                          />
                        </Form.Item>
                        
                        {/* Hidden field to store customer ID */}
                        <Form.Item
                          name="loan_dsbrsmnt_cust_id"
                          hidden
                          rules={[
                            {
                              required: true,
                              message: "Customer is required",
                            },
                          ]}
                        >
                          <Input type="hidden" />
                        </Form.Item>
                      </div>

                      <div className="col-md-6">
                        <Form.Item
                          name="loan_dsbrsmnt_dt"
                          label="Disbursement Date"
                          rules={[
                            {
                              required: true,
                              message: "Please select a date",
                            },
                          ]}
                        >
                          <div style={{ 
                            display: 'flex', 
                            border: '1px solid #d9d9d9', 
                            borderRadius: '6px',
                            overflow: 'hidden',
                            height: '40px',
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '44px',
                              backgroundColor: '#fafafa',
                              borderRight: '1px solid #d9d9d9',
                              flexShrink: 0
                            }}>
                              <CalendarOutlined />
                            </div>
                            <input
                              type="date"
                              autoComplete="off"
                              onPaste={(e) => e.preventDefault()}
                              onCopy={(e) => e.preventDefault()}
                              onCut={(e) => e.preventDefault()}
                              onContextMenu={(e) => e.preventDefault()}
                              onDrop={(e) => e.preventDefault()}
                              value={form.getFieldValue('loan_dsbrsmnt_dt') || ''}
                              onChange={(e) => {
                                form.setFieldsValue({ loan_dsbrsmnt_dt: e.target.value });
                              }}
                              style={{
                                flex: 1,
                                border: 'none',
                                outline: 'none',
                                padding: '0 11px',
                                fontSize: '14px',
                                width: '100%',
                              }}
                            />
                          </div>
                        </Form.Item>
                      </div>
                    </div>

                    <div className="row mb-2">
                      <div className="col-md-4">
                        <Form.Item label="Branch">
                          <InputWithAddon
                            icon={<BankOutlined />}
                            value={branchName}
                            disabled
                            style={{
                              backgroundColor: '#f5f5f5',
                              color: '#000',
                              cursor: 'not-allowed'
                            }}
                          />
                        </Form.Item>
                      </div>

                      <div className="col-md-4">
                        <Form.Item label="Line">
                          <InputWithAddon
                            icon={<ApartmentOutlined />}
                            value={lineName}
                            disabled
                            style={{
                              backgroundColor: '#f5f5f5',
                              color: '#000',
                              cursor: 'not-allowed'
                            }}
                          />
                        </Form.Item>
                      </div>

                      <div className="col-md-4">
                        <Form.Item label="Area">
                          <InputWithAddon
                            icon={<EnvironmentOutlined />}
                            value={areaName}
                            disabled
                            style={{
                              backgroundColor: '#f5f5f5',
                              color: '#000',
                              cursor: 'not-allowed'
                            }}
                          />
                        </Form.Item>
                      </div>
                    </div>

                    <Divider style={{ borderTop: "1px solid #d9d9d9" }} />
                    <Divider orientation="center">Loan Details</Divider>

                    {/* Repayment Type and Loan Amount Row */}
                    <div className="row mb-2">
                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_repmnt_type"
                          label="Repayment Type"
                          rules={[
                            {
                              required: true,
                              message: "Please select repayment type",
                            },
                          ]}
                        >
                          <SelectWithAddon
                            icon={<SyncOutlined />}
                            placeholder="Select Repayment Type"
                            allowClear
                            size="large"
                          >
                            {loanRepaymentTypes.map((type) => (
                              <Select.Option
                                key={type.value}
                                value={type.value}
                              >
                                {type.label}
                              </Select.Option>
                            ))}
                          </SelectWithAddon>
                        </Form.Item>
                      </div>

                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_amnt"
                          label="Loan Amount"
                          rules={[
                            {
                              required: true,
                              message: "Please enter loan amount",
                            },
                          ]}
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            placeholder="Enter Loan Amount"
                            min={0}
                            precision={2}
                            size="large"
                            prefix="₹"
                            addonBefore={
                              <span style={{ display: "flex", alignItems: "center" }}>
                                <DollarOutlined />
                              </span>
                            }
                          />
                        </Form.Item>
                      </div>

                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_intrst_amnt"
                          label="Interest Amount"
                          rules={[
                            {
                              required: true,
                              message: "Please enter interest amount",
                            },
                          ]}
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            placeholder="Enter Interest Amount"
                            min={0}
                            precision={2}
                            size="large"
                            prefix="₹"
                            addonBefore={
                              <span style={{ display: "flex", alignItems: "center" }}>
                                <PercentageOutlined />
                              </span>
                            }
                          />
                        </Form.Item>
                      </div>
                    </div>

                    {/* Installments, Processing Fee, Installment Amount Row */}
                    <div className="row mb-2">
                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_tot_instlmnt"
                          label="Total Installments"
                          rules={[
                            {
                              required: true,
                              message: "Please enter number of installments",
                            },
                          ]}
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            placeholder="Enter Number of Installments"
                            min={1}
                            precision={0}
                            size="large"
                            addonBefore={
                              <span style={{ display: "flex", alignItems: "center" }}>
                                <NumberOutlined />
                              </span>
                            }
                          />
                        </Form.Item>
                      </div>

                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_prcsng_fee_amnt"
                          label="Processing Fee"
                          rules={[
                            {
                              required: true,
                              message: "Please enter processing fee",
                            },
                          ]}
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            placeholder="Enter Processing Fee"
                            min={0}
                            precision={2}
                            size="large"
                            prefix="₹"
                            addonBefore={
                              <span style={{ display: "flex", alignItems: "center" }}>
                                <DollarOutlined />
                              </span>
                            }
                          />
                        </Form.Item>
                      </div>

                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_instlmnt_amnt"
                          label="Installment Amount"
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            placeholder="Auto-calculated"
                            min={0}
                            precision={2}
                            disabled
                            size="large"
                            prefix="₹"
                            addonBefore={
                              <span style={{ display: "flex", alignItems: "center" }}>
                                <WalletOutlined />
                              </span>
                            }
                          />
                        </Form.Item>
                      </div>
                    </div>

                    {/* Default Pay Amount, Bad Loan Days, Payment Mode Row */}
                    <div className="row mb-2">
                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_dflt_pay_amnt"
                          label="Default Pay Amount"
                          rules={[
                            {
                              required: true,
                              message: "Please enter default pay amount",
                            },
                          ]}
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            placeholder="Enter Default Pay Amount"
                            min={0}
                            precision={2}
                            size="large"
                            prefix="₹"
                            addonBefore={
                              <span style={{ display: "flex", alignItems: "center" }}>
                                <DollarOutlined />
                              </span>
                            }
                          />
                        </Form.Item>
                      </div>

                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_bad_loan_days"
                          label="Bad Loan Days"
                          rules={[
                            {
                              required: true,
                              message: "Please enter bad loan days",
                            },
                          ]}
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            placeholder="Enter Bad Loan Days"
                            min={0}
                            precision={0}
                            size="large"
                            addonBefore={
                              <span style={{ display: "flex", alignItems: "center" }}>
                                <FieldTimeOutlined />
                              </span>
                            }
                          />
                        </Form.Item>
                      </div>

                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_mode"
                          label="Payment Mode"
                          rules={[
                            {
                              required: true,
                              message: "Please select payment mode",
                            },
                          ]}
                        >
                          <SelectWithAddon
                            icon={<CreditCardOutlined />}
                            placeholder="Select Payment Mode"
                            allowClear
                            size="large"
                            onChange={handlePaymentModeChange}
                          >
                            {paymentModes.map((mode) => (
                              <Select.Option
                                key={mode.value}
                                value={mode.value}
                              >
                                {mode.label}
                              </Select.Option>
                            ))}
                          </SelectWithAddon>
                        </Form.Item>
                      </div>
                    </div>

                    {/* Conditional Fields for "Both" Payment Mode */}
                    {paymentMode === "Both" && (
                      <>
                        <Divider style={{ borderTop: "1px solid #d9d9d9" }} />
                        <Divider orientation="center">Payment Split Details</Divider>
                        
                        <div className="row mb-2">
                          <div className="col-md-6">
                            <Form.Item
                              name="loan_dsbrsmnt_online_amnt"
                              label="Online Amount"
                              rules={[
                                {
                                  required: true,
                                  message: "Please enter online amount",
                                },
                              ]}
                            >
                              <InputNumber
                                style={{ width: "100%" }}
                                placeholder="Enter Online Amount"
                                min={0}
                                precision={2}
                                size="large"
                                prefix="₹"
                                addonBefore={
                                  <span style={{ display: "flex", alignItems: "center" }}>
                                    <BankOutlined />
                                  </span>
                                }
                              />
                            </Form.Item>
                          </div>

                          <div className="col-md-6">
                            <Form.Item
                              name="loan_dsbrsmnt_cash_amnt"
                              label="Cash Amount"
                              rules={[
                                {
                                  required: true,
                                  message: "Please enter cash amount",
                                },
                              ]}
                            >
                              <InputNumber
                                style={{ width: "100%" }}
                                placeholder="Enter Cash Amount"
                                min={0}
                                precision={2}
                                size="large"
                                prefix="₹"
                                addonBefore={
                                  <span style={{ display: "flex", alignItems: "center" }}>
                                    <WalletOutlined />
                                  </span>
                                }
                              />
                            </Form.Item>
                          </div>
                        </div>

                        <div className="row mb-2">
                          <div className="col-md-6">
                            <Form.Item
                              name="loan_dsbrsmnt_online_remarks"
                              label="Online Payment Remarks"
                            >
                              <TextArea
                                placeholder="Enter online payment remarks or transaction details"
                                autoSize={{ minRows: 2, maxRows: 6 }}
                                allowClear
                              />
                            </Form.Item>
                          </div>

                          <div className="col-md-6">
                            <Form.Item
                              name="loan_dsbrsmnt_cash_remarks"
                              label="Cash Payment Remarks"
                            >
                              <TextArea
                                placeholder="Enter cash payment remarks or details"
                                autoSize={{ minRows: 2, maxRows: 6}}
                                allowClear
                              />
                            </Form.Item>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Comments */}
                    <div className="row mb-2">
                      <div className="col-md-12">
                        <Form.Item
                          name="loan_dsbrsmnt_comnt"
                          label="Comments"
                        >
                          <TextArea
                            placeholder="Enter comments or remarks about the loan disbursement"
                            autoSize={{ minRows: 2, maxRows: 6 }}
                            allowClear
                            prefix={<CommentOutlined />}
                          />
                        </Form.Item>
                      </div>
                    </div>

                    <Divider style={{ borderTop: "2px solid #d9d9d9" }} />
                    
                    <div className="text-center mt-4">
                      <Space size="middle">
                        <Button
                          size="large"
                          onClick={() => navigate("/disburse-loan")}
                        >
                          Cancel
                        </Button>

                        <Button type="primary" htmlType="submit" size="large">
                          {isEditMode ? "Update Loan" : "Create Loan"}
                        </Button>
                      </Space>
                    </div>
                  </div>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default DisburseLoanForm;