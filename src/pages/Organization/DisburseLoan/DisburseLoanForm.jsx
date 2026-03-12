import {
  Form,
  Input,
  InputNumber,
  Button,
  Divider,
  Space,
  notification,
  Alert,
  Card,
  Grid,
  Select,
  Empty,
  Spin,
} from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Fragment, useState, useEffect, useCallback } from 'react';
import Loader from 'components/Common/Loader';
import {
  ReloadOutlined,
  CalendarOutlined,
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
  CalculatorOutlined,
} from '@ant-design/icons';
import { GET, POST, PUT } from 'helpers/api_helper';
import { devLog } from '../../../utils/environment';
import SelectWithAddon from 'components/Common/SelectWithAddon';
import InputWithAddon from 'components/Common/InputWithAddon';
import './DisburseLoanForm.css';

const { TextArea } = Input;

// ── Payment mode value mapping (API uses integers) ───────────────────────────
const MODE_TO_INT = { Cash: '1', Online: '2', Both: '3' };
const INT_TO_MODE = { 1: 'Cash', 2: 'Online', 3: 'Both', '1': 'Cash', '2': 'Online', '3': 'Both' };

const DisburseLoanForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  // ── State ──────────────────────────────────────────────────────────────────
  const [customerList, setCustomerList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [paymentMode, setPaymentMode] = useState('Online');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);

  // ── Date states ────────────────────────────────────────────────────────────
  const [disbursementDt, setDisbursementDt] = useState('');
  const [firstInstlmntDt, setFirstInstlmntDt] = useState('');
  const [dayOfInstlmnt, setDayOfInstlmnt] = useState('');

  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();

  // Branch / Line / Area
  const [branchId, setBranchId] = useState(null);
  const [lineId, setLineId] = useState(null);
  const [areaId, setAreaId] = useState(null);
  const [branchName, setBranchName] = useState('');
  const [lineName, setLineName] = useState('');
  const [areaName, setAreaName] = useState('');

  // Navigation state
  const navigationState = location.state || {};
  const { mode, customerId, customerName: navCustomerName, loanData } = navigationState;

  // ── Live-watch the three amount fields for the total ───────────────────────
  const loanAmount     = Form.useWatch('loan_dsbrsmnt_amnt', form)           ?? 0;
  const interestAmount = Form.useWatch('loan_dsbrsmnt_intrst_amnt', form)    ?? 0;
  const processingFee  = Form.useWatch('loan_dsbrsmnt_prcsng_fee_amnt', form) ?? 0;
  const totalAmount    = Number(loanAmount) + Number(interestAmount) + Number(processingFee);

  // ── Determine mode ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (params.mode === 'edit' || mode === 'edit' || (params.id && params.id !== 'add')) {
      setIsEditMode(true);
      setIsAddMode(false);
    } else if (params.mode === 'add' || mode === 'add' || params.id === 'add') {
      setIsAddMode(true);
      setIsEditMode(false);
    }

    if (navigationState.branchId) setBranchId(navigationState.branchId);
    if (navigationState.lineId) setLineId(navigationState.lineId);
    if (navigationState.areaId) setAreaId(navigationState.areaId);
    if (navigationState.branchName) setBranchName(navigationState.branchName);
    if (navigationState.lineName) setLineName(navigationState.lineName);
    if (navigationState.areaName) setAreaName(navigationState.areaName);
  }, []);

  // ── Fetch customer dropdown — filtered by area_id from localStorage ─────────
  const loadCustomerList = useCallback(async (areaIdParam) => {
    try {
      setCustomerLoading(true);
      const url = areaIdParam
        ? `api/customer_dd/?area_id=${areaIdParam}`
        : 'api/customer_dd/';
      const response = await GET(url);
      if (response?.status === 200) {
        const raw = Array.isArray(response.data) ? response.data : response.data?.results ?? [];
        setCustomerList(raw);
        devLog('customer_dd loaded:', raw);
      } else {
        notification.warning({
          message: 'Customer List Unavailable',
          description: 'Failed to load customer list.',
          duration: 5,
        });
        setCustomerList([]);
      }
    } catch (err) {
      console.error('Error loading customer_dd:', err);
      notification.warning({
        message: 'Customer List Unavailable',
        description: 'Failed to load customer list. Please try again.',
        duration: 5,
      });
      setApiError(true);
      setCustomerList([]);
    } finally {
      setCustomerLoading(false);
    }
  }, []);

  // ── On mount: load customers filtered by area_id from localStorage ──────────
  useEffect(() => {
    const selectedAreaId = localStorage.getItem('selected_area_id');
    console.log('Area id ', selectedAreaId);
    loadCustomerList(selectedAreaId);
  }, [loadCustomerList]);

  // ── Load loan details for EDIT mode ───────────────────────────────────────
  useEffect(() => {
    if (isEditMode && params.id && params.id !== 'add' && !isNaN(params.id)) {
      setLoading(true);
      GET(`api/disburse_loan/${params.id}/`)
        .then((response) => {
          const res = response?.data ?? response;
          devLog('Loan details:', res);

          const modeStr = INT_TO_MODE[res.loan_dsbrsmnt_mode] ?? 'Cash';
          setPaymentMode(modeStr);
          setBranchId(res.loan_dsbrsmnt_brnch_id);
          setLineId(res.loan_dsbrsmnt_line_id);
          setAreaId(res.loan_dsbrsmnt_area_id);
          setBranchName(res.LOAN_DSBRSMNT_BRNCH_NM ?? res.branch_name ?? '');
          setLineName(res.LOAN_DSBRSMNT_LINE_NM ?? res.line_name ?? '');
          setAreaName(res.LOAN_DSBRSMNT_AREA_NM ?? res.area_name ?? '');

          if (res.loan_dsbrsmnt_dt) setDisbursementDt(res.loan_dsbrsmnt_dt);
          if (res.first_instlmnt_dt) setFirstInstlmntDt(res.first_instlmnt_dt);
          if (res.day_of_instlmnt) setDayOfInstlmnt(res.day_of_instlmnt);

          const storedAreaId = localStorage.getItem('selected_area_id') ?? null;
          loadCustomerList(res.loan_dsbrsmnt_area_id ?? storedAreaId);

          const cid = res.loan_dsbrsmnt_cust_id;
          const found = customerList.find(c => c.id === cid);
          if (found) setSelectedCustomer(found);

          form.setFieldsValue({
            loan_dsbrsmnt_cust_id: cid,
            loan_dsbrsmnt_dt: res.loan_dsbrsmnt_dt ?? '',
            loan_dsbrsmnt_repmnt_type: res.loan_dsbrsmnt_repmnt_type,
            loan_dsbrsmnt_amnt: res.loan_dsbrsmnt_amnt,
            loan_dsbrsmnt_intrst_amnt: res.loan_dsbrsmnt_intrst_amnt,
            loan_dsbrsmnt_tot_instlmnt: res.loan_dsbrsmnt_tot_instlmnt,
            loan_dsbrsmnt_prcsng_fee_amnt: res.loan_dsbrsmnt_prcsng_fee_amnt,
            loan_dsbrsmnt_instlmnt_amnt: res.loan_dsbrsmnt_instlmnt_amnt,
            loan_dsbrsmnt_dflt_pay_amnt: res.loan_dsbrsmnt_dflt_pay_amnt,
            loan_dsbrsmnt_bad_loan_days: res.loan_dsbrsmnt_bad_loan_days,
            loan_dsbrsmnt_mode: modeStr,
            loan_dsbrsmnt_remark: res.loan_dsbrsmnt_remark ?? res.loan_dsbrsmnt_comnt ?? '',
            loan_dsbrsmnt_amnt_online: res.loan_dsbrsmnt_amnt_online ?? null,
            loan_dsbrsmnt_amnt_cash: res.loan_dsbrsmnt_amnt_cash ?? null,
            loan_dsbrsmnt_amnt_online_remark: res.loan_dsbrsmnt_amnt_online_remark ?? '',
            loan_dsbrsmnt_amnt_cash_remark: res.loan_dsbrsmnt_amnt_cash_remark ?? '',
            first_instlmnt_dt: res.first_instlmnt_dt ?? '',
            day_of_instlmnt: res.day_of_instlmnt ?? '',
          });
        })
        .catch((error) => {
          console.error('Error fetching loan details:', error);
          notification.error({
            message: 'Failed to load loan details',
            description: 'Please try again later.',
          });
        })
        .finally(() => setLoading(false));
    } else if (isAddMode) {
      if (customerId) {
        form.setFieldsValue({ loan_dsbrsmnt_cust_id: customerId });
        const found = customerList.find(c => c.id === customerId);
        if (found) setSelectedCustomer(found);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [isEditMode, isAddMode, params.id, customerId]);

  // ── Re-resolve selected customer when customerList loads ───────────────────
  useEffect(() => {
    const cid = form.getFieldValue('loan_dsbrsmnt_cust_id');
    if (cid && customerList.length > 0 && !selectedCustomer) {
      const found = customerList.find(c => c.id === cid);
      if (found) {
        setSelectedCustomer(found);
        if (isAddMode) {
          setBranchId(found.branch);
          setLineId(found.line);
          setAreaId(found.area);
          setBranchName(found.branch_name ?? '');
          setLineName(found.line_name ?? '');
          setAreaName(found.area_name ?? '');
        }
      }
    }
  }, [customerList]);

  // ── Customer selection handler ─────────────────────────────────────────────
  const handleCustomerChange = (selectedId) => {
    const customer = customerList.find(c => c.id === selectedId);
    if (customer) {
      setSelectedCustomer(customer);
      setBranchId(customer.branch);
      setLineId(customer.line);
      setAreaId(customer.area);
      setBranchName(customer.branch_name ?? '');
      setLineName(customer.line_name ?? '');
      setAreaName(customer.area_name ?? '');
      form.setFieldsValue({ loan_dsbrsmnt_cust_id: selectedId });
    } else {
      setSelectedCustomer(null);
      setBranchId(null); setLineId(null); setAreaId(null);
      setBranchName(''); setLineName(''); setAreaName('');
    }
  };

  // ── Payment mode change ────────────────────────────────────────────────────
  const handlePaymentModeChange = (value) => {
    setPaymentMode(value);
    form.setFieldsValue({
      loan_dsbrsmnt_amnt_online: undefined,
      loan_dsbrsmnt_amnt_cash: undefined,
      loan_dsbrsmnt_amnt_online_remark: undefined,
      loan_dsbrsmnt_amnt_cash_remark: undefined,
    });
  };

  // ── Disbursement date change ───────────────────────────────────────────────
  const handleDisbursementDateChange = (e) => {
    const dateVal = e.target.value;
    setDisbursementDt(dateVal);
    form.setFieldsValue({ loan_dsbrsmnt_dt: dateVal });
  };

  // ── First installment date change ─────────────────────────────────────────
  const handleFirstInstallmentDateChange = (e) => {
    const dateVal = e.target.value;
    setFirstInstlmntDt(dateVal);
    form.setFieldsValue({ first_instlmnt_dt: dateVal });
    if (dateVal) {
      const dayName = new Date(dateVal).toLocaleDateString('en-US', { weekday: 'long' });
      setDayOfInstlmnt(dayName);
      form.setFieldsValue({ day_of_instlmnt: dayName });
    } else {
      setDayOfInstlmnt('');
      form.setFieldsValue({ day_of_instlmnt: '' });
    }
  };

  // ── Form submit ────────────────────────────────────────────────────────────
  const onFinish = async (values) => {
    if (!branchId || !lineId || !areaId) {
      notification.error({
        message: 'Missing Required Information',
        description: 'Branch, Line, and Area information is required. Please select a customer.',
      });
      return;
    }

    const firstDate = values.first_instlmnt_dt;
    const enteredDay = values.day_of_instlmnt;
    if (firstDate && enteredDay) {
      const actualDay = new Date(firstDate).toLocaleDateString('en-US', { weekday: 'long' });
      if (actualDay.toLowerCase() !== enteredDay.toLowerCase()) {
        notification.error({
          message: 'Day Mismatch',
          description: `The selected date falls on a ${actualDay}, but "${enteredDay}" was derived. Please re-select the date.`,
          duration: 5,
        });
        return;
      }
    }

    setLoading(true);
    try {
      const modeInt = MODE_TO_INT[values.loan_dsbrsmnt_mode] ?? '1';
      const mode = values.loan_dsbrsmnt_mode;

      let cashAmount = null;
      let onlineAmount = null;
      let cashRemark = null;
      let onlineRemark = null;

      if (mode === 'Cash') {
        cashAmount = String(values.loan_dsbrsmnt_amnt_cash ?? 0);
        cashRemark = values.loan_dsbrsmnt_amnt_cash_remark ?? null;
      } else if (mode === 'Online') {
        onlineAmount = String(values.loan_dsbrsmnt_amnt_online ?? 0);
        onlineRemark = values.loan_dsbrsmnt_amnt_online_remark ?? null;
      } else if (mode === 'Both') {
        cashAmount = String(values.loan_dsbrsmnt_amnt_cash ?? 0);
        onlineAmount = String(values.loan_dsbrsmnt_amnt_online ?? 0);
        cashRemark = values.loan_dsbrsmnt_amnt_cash_remark ?? null;
        onlineRemark = values.loan_dsbrsmnt_amnt_online_remark ?? null;
      }

      const formData = {
        loan_dsbrsmnt_brnch_id: branchId,
        loan_dsbrsmnt_line_id: lineId,
        loan_dsbrsmnt_area_id: areaId,
        loan_dsbrsmnt_cust_id: values.loan_dsbrsmnt_cust_id,
        loan_dsbrsmnt_repmnt_type: values.loan_dsbrsmnt_repmnt_type,
        loan_dsbrsmnt_amnt: String(values.loan_dsbrsmnt_amnt),
        loan_dsbrsmnt_intrst_amnt: String(values.loan_dsbrsmnt_intrst_amnt),
        loan_dsbrsmnt_tot_instlmnt: values.loan_dsbrsmnt_tot_instlmnt,
        loan_dsbrsmnt_prcsng_fee_amnt: String(values.loan_dsbrsmnt_prcsng_fee_amnt),
        loan_dsbrsmnt_instlmnt_amnt: String(values.loan_dsbrsmnt_instlmnt_amnt),
        loan_dsbrsmnt_dflt_pay_amnt: String(values.loan_dsbrsmnt_dflt_pay_amnt),
        loan_dsbrsmnt_bad_loan_days: values.loan_dsbrsmnt_bad_loan_days,
        loan_dsbrsmnt_mode: modeInt,
        loan_dsbrsmnt_remark: values.loan_dsbrsmnt_remark ?? '',
        loan_dsbrsmnt_dt: values.loan_dsbrsmnt_dt,
        loan_dsbrsmnt_amnt_cash: cashAmount,
        loan_dsbrsmnt_amnt_online: onlineAmount,
        loan_dsbrsmnt_amnt_cash_remark: cashRemark,
        loan_dsbrsmnt_amnt_online_remark: onlineRemark,
        first_instlmnt_dt: values.first_instlmnt_dt,
        day_of_instlmnt: values.day_of_instlmnt,
      };

      devLog('Submitting formData:', formData);

      let response;
      if (isEditMode && params.id) {
        response = await PUT(`api/disburse_loan/${params.id}/`, formData);
      } else {
        response = await POST('api/disburse_loan/', formData);
      }

      if (response?.status === 200 || response?.status === 201) {
        notification.success({
          message: `Loan disbursement ${isEditMode ? 'updated' : 'created'} successfully!`,
          description: `Loan for ${selectedCustomer?.customer_name ?? navCustomerName ?? ''} has been ${isEditMode ? 'updated' : 'created'}.`,
        });
        navigate('/disburse-loan');
      } else {
        notification.error({
          message: `Failed to ${isEditMode ? 'update' : 'create'} loan disbursement`,
          description: response?.data?.message ?? 'Please check your input and try again.',
        });
      }
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'An error occurred while saving the loan disbursement',
        description: error.message ?? 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loanRepaymentTypes = [
    { label: 'Daily', value: 'Daily' },
    { label: 'Weekly', value: 'Weekly' },
    { label: 'Monthly', value: 'Monthly' },
  ];

  const paymentModes = [
    { label: 'Cash', value: 'Cash' },
    { label: 'Online', value: 'Online' },
    { label: 'Both', value: 'Both' },
  ];

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading && customerList.length === 0) {
    return (
      <div className="loan-form-page-content">
        <div className="loan-form-container-fluid">
          <div className="row">
            <div className="col-md-12">
              <Card>
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                  <div className="text-center">
                    <Loader />
                    <p className="mt-3 text-muted">Loading loan disbursement form...</p>
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
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                  <div className="text-center">
                    <Alert
                      message="Connection Error"
                      description="Unable to load the required data. Please check your connection and try again."
                      type="error" showIcon className="mb-4"
                    />
                    <Space>
                      <Button type="primary" onClick={() => window.location.reload()} icon={<ReloadOutlined />}>
                        Retry
                      </Button>
                      <Button onClick={() => navigate('/disburse-loan')}>Go Back</Button>
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

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <Fragment>
      <div className="loan-form-page-content">
        {loading && <Loader />}
        <div className="loan-form-container-fluid">
          <div className="row">
            <div className="col-md-12">

              <div className="loan-form-header">
                <h2 className="loan-form-title">{isEditMode ? 'Edit Loan' : 'Add New Loan'}</h2>
              </div>

              <div className="loan-form-wrapper">
                <Form form={form} layout="vertical" onFinish={onFinish} className="loan-disbursement-form">
                  <div className="loan-form-container">

                    {/* ── Customer + Disbursement Date ─────────────────────── */}
                    <div className="row mb-2">
                      <div className="col-md-6">
                        <Form.Item
                          name="loan_dsbrsmnt_cust_id"
                          label="Customer"
                          rules={[{ required: true, message: 'Please select a customer' }]}
                        >
                          <Select
                            showSearch
                            placeholder="Search and select customer"
                            size="large"
                            loading={customerLoading}
                            onChange={handleCustomerChange}
                            disabled={isEditMode}
                            notFoundContent={
                              customerLoading
                                ? <Spin size="small" />
                                : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No customers found" />
                            }
                            filterOption={(input, option) => {
                              const label = option?.children?.toString()?.toLowerCase() ?? '';
                              return label.includes(input.toLowerCase());
                            }}
                            optionLabelProp="label"
                          >
                            {customerList.map(c => (
                              <Select.Option key={c.id} value={c.id} label={c.customer_name}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 600 }}>{c.customer_name}</span>
                                  <span style={{ fontSize: '11px', color: '#8c8c8c' }}>
                                    {c.customer_id} · {c.area_name}, {c.line_name}
                                  </span>
                                </div>
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </div>

                      <div className="col-md-6">
                        <Form.Item
                          name="loan_dsbrsmnt_dt"
                          label="Disbursement Date"
                          rules={[{ required: true, message: 'Please select a date' }]}
                        >
                          <div style={{ display: 'flex', border: '1px solid #d9d9d9', borderRadius: '6px', overflow: 'hidden', height: '40px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', backgroundColor: '#fafafa', borderRight: '1px solid #d9d9d9', flexShrink: 0 }}>
                              <CalendarOutlined />
                            </div>
                            <input
                              type="date"
                              autoComplete="off"
                              value={disbursementDt}
                              onChange={handleDisbursementDateChange}
                              style={{ flex: 1, border: 'none', outline: 'none', padding: '0 11px', fontSize: '14px', width: '100%' }}
                            />
                          </div>
                        </Form.Item>
                      </div>
                    </div>

                    {/* ── Branch / Line / Area (read-only) ─────────────────── */}
                    <div className="row mb-2">
                      <div className="col-md-4">
                        <Form.Item label="Branch">
                          <InputWithAddon
                            icon={<BankOutlined />}
                            value={branchName}
                            disabled
                            placeholder="Auto-filled from customer"
                            style={{ backgroundColor: '#f5f5f5', color: '#000', cursor: 'not-allowed' }}
                          />
                        </Form.Item>
                      </div>
                      <div className="col-md-4">
                        <Form.Item label="Line">
                          <InputWithAddon
                            icon={<ApartmentOutlined />}
                            value={lineName}
                            disabled
                            placeholder="Auto-filled from customer"
                            style={{ backgroundColor: '#f5f5f5', color: '#000', cursor: 'not-allowed' }}
                          />
                        </Form.Item>
                      </div>
                      <div className="col-md-4">
                        <Form.Item label="Area">
                          <InputWithAddon
                            icon={<EnvironmentOutlined />}
                            value={areaName}
                            disabled
                            placeholder="Auto-filled from customer"
                            style={{ backgroundColor: '#f5f5f5', color: '#000', cursor: 'not-allowed' }}
                          />
                        </Form.Item>
                      </div>
                    </div>

                    <Divider style={{ borderTop: '1px solid #d9d9d9' }} />

                    {/* ── First Installment Date / Day of Installment ──────── */}
                    <div className="row mb-2">
                      <div className="col-md-6">
                        <Form.Item
                          name="first_instlmnt_dt"
                          label="First Installment Date"
                          rules={[{ required: true, message: 'Please select the first installment date' }]}
                        >
                          <div style={{ display: 'flex', border: '1px solid #d9d9d9', borderRadius: '6px', overflow: 'hidden', height: '40px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', backgroundColor: '#fafafa', borderRight: '1px solid #d9d9d9', flexShrink: 0 }}>
                              <CalendarOutlined />
                            </div>
                            <input
                              type="date"
                              autoComplete="off"
                              value={firstInstlmntDt}
                              onChange={handleFirstInstallmentDateChange}
                              style={{ flex: 1, border: 'none', outline: 'none', padding: '0 11px', fontSize: '14px', width: '100%' }}
                            />
                          </div>
                        </Form.Item>
                      </div>

                      <div className="col-md-6">
                        <Form.Item
                          name="day_of_instlmnt"
                          label="Day of Installment"
                          rules={[
                            { required: true, message: 'Please select a first installment date to auto-fill this field' },
                            {
                              validator: (_, value) => {
                                const firstDate = form.getFieldValue('first_instlmnt_dt');
                                if (!firstDate || !value) return Promise.resolve();
                                const actualDay = new Date(firstDate).toLocaleDateString('en-US', { weekday: 'long' });
                                if (actualDay.toLowerCase() !== value.toLowerCase()) {
                                  return Promise.reject(new Error(`Date falls on ${actualDay} — day must match`));
                                }
                                return Promise.resolve();
                              },
                            },
                          ]}
                        >
                          <Input
                            placeholder="Auto-filled from date (e.g. Wednesday)"
                            addonBefore={<CalendarOutlined />}
                            size="large"
                            value={dayOfInstlmnt}
                            readOnly
                            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                          />
                        </Form.Item>
                      </div>
                    </div>

                    <Divider orientation="center">Loan Details</Divider>

                    {/* ── Repayment Type / Loan Amount / Interest ───────────── */}
                    <div className="row mb-2">
                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_repmnt_type"
                          label="Repayment Type"
                          rules={[{ required: true, message: 'Please select repayment type' }]}
                        >
                          <SelectWithAddon icon={<SyncOutlined />} placeholder="Select Repayment Type" allowClear size="large">
                            {loanRepaymentTypes.map(t => (
                              <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>
                            ))}
                          </SelectWithAddon>
                        </Form.Item>
                      </div>
                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_amnt"
                          label="Loan Amount"
                          rules={[{ required: true, message: 'Please enter loan amount' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }} placeholder="Enter Loan Amount"
                            min={0} precision={2} size="large" prefix="₹" addonBefore={<DollarOutlined />}
                          />
                        </Form.Item>
                      </div>
                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_intrst_amnt"
                          label="Interest Amount"
                          rules={[{ required: true, message: 'Please enter interest amount' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }} placeholder="Enter Interest Amount"
                            min={0} precision={2} size="large" prefix="₹" addonBefore={<PercentageOutlined />}
                          />
                        </Form.Item>
                      </div>
                    </div>

                    {/* ── Installments / Processing Fee / Installment Amount ── */}
                    <div className="row mb-2">
                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_tot_instlmnt"
                          label="Total Installments"
                          rules={[{ required: true, message: 'Please enter number of installments' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }} placeholder="Enter Total Installments"
                            min={1} precision={0} size="large" addonBefore={<NumberOutlined />}
                          />
                        </Form.Item>
                      </div>
                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_prcsng_fee_amnt"
                          label="Processing Fee"
                          rules={[{ required: true, message: 'Please enter processing fee' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }} placeholder="Enter Processing Fee"
                            min={0} precision={2} size="large" prefix="₹" addonBefore={<DollarOutlined />}
                          />
                        </Form.Item>
                      </div>
                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_instlmnt_amnt"
                          label="Installment Amount"
                          rules={[{ required: true, message: 'Please enter installment amount' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }} placeholder="Enter Installment Amount"
                            min={0} precision={2} size="large" prefix="₹" addonBefore={<WalletOutlined />}
                          />
                        </Form.Item>
                      </div>
                    </div>

                    {/* ── Default Pay / Bad Loan Days / Payment Mode ──────────── */}
                    <div className="row mb-2">
                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_dflt_pay_amnt"
                          label="Default Pay Amount"
                          rules={[{ required: true, message: 'Please enter default pay amount' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }} placeholder="Enter Default Pay Amount"
                            min={0} precision={2} size="large" prefix="₹" addonBefore={<DollarOutlined />}
                          />
                        </Form.Item>
                      </div>
                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_bad_loan_days"
                          label="Bad Loan Days"
                          rules={[{ required: true, message: 'Please enter bad loan days' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }} placeholder="Enter Bad Loan Days"
                            min={0} precision={0} size="large" addonBefore={<FieldTimeOutlined />}
                          />
                        </Form.Item>
                      </div>
                      <div className="col-md-4">
                        <Form.Item
                          name="loan_dsbrsmnt_mode"
                          label="Payment Mode"
                          rules={[{ required: true, message: 'Please select payment mode' }]}
                        >
                          <SelectWithAddon
                            icon={<CreditCardOutlined />}
                            placeholder="Select Payment Mode"
                            allowClear size="large"
                            onChange={handlePaymentModeChange}
                          >
                            {paymentModes.map(m => (
                              <Select.Option key={m.value} value={m.value}>{m.label}</Select.Option>
                            ))}
                          </SelectWithAddon>
                        </Form.Item>
                      </div>
                    </div>

                    {/* ── Cash mode ─────────────────────────────────────────── */}
                    {paymentMode === 'Cash' && (
                      <>
                        <Divider style={{ borderTop: '1px solid #d9d9d9' }} />
                        <Divider orientation="center">Cash Payment Details</Divider>
                        <div className="row mb-2">
                          <div className="col-md-6">
                            <Form.Item
                              name="loan_dsbrsmnt_amnt_cash"
                              label="Cash Amount"
                              rules={[{ required: true, message: 'Please enter cash amount' }]}
                            >
                              <InputNumber
                                style={{ width: '100%' }} placeholder="Enter Cash Amount"
                                min={0} precision={2} size="large" prefix="₹" addonBefore={<WalletOutlined />}
                              />
                            </Form.Item>
                          </div>
                          <div className="col-md-6">
                            <Form.Item name="loan_dsbrsmnt_amnt_cash_remark" label="Cash Payment Remarks">
                              <TextArea
                                placeholder="Enter cash payment remarks"
                                autoSize={{ minRows: 2, maxRows: 6 }} allowClear
                              />
                            </Form.Item>
                          </div>
                        </div>
                      </>
                    )}

                    {/* ── Online mode ───────────────────────────────────────── */}
                    {paymentMode === 'Online' && (
                      <>
                        <Divider style={{ borderTop: '1px solid #d9d9d9' }} />
                        <Divider orientation="center">Online Payment Details</Divider>
                        <div className="row mb-2">
                          <div className="col-md-6">
                            <Form.Item
                              name="loan_dsbrsmnt_amnt_online"
                              label="Online Amount"
                              rules={[{ required: true, message: 'Please enter online amount' }]}
                            >
                              <InputNumber
                                style={{ width: '100%' }} placeholder="Enter Online Amount"
                                min={0} precision={2} size="large" prefix="₹" addonBefore={<BankOutlined />}
                              />
                            </Form.Item>
                          </div>
                          <div className="col-md-6">
                            <Form.Item name="loan_dsbrsmnt_amnt_online_remark" label="Online Payment Remarks">
                              <TextArea
                                placeholder="Enter online payment remarks"
                                autoSize={{ minRows: 2, maxRows: 6 }} allowClear
                              />
                            </Form.Item>
                          </div>
                        </div>
                      </>
                    )}

                    {/* ── Both mode ─────────────────────────────────────────── */}
                    {paymentMode === 'Both' && (
                      <>
                        <Divider style={{ borderTop: '1px solid #d9d9d9' }} />
                        <Divider orientation="center">Payment Split Details</Divider>
                        <div className="row mb-2">
                          <div className="col-md-6">
                            <Form.Item
                              name="loan_dsbrsmnt_amnt_online"
                              label="Online Amount"
                              rules={[{ required: true, message: 'Please enter online amount' }]}
                            >
                              <InputNumber
                                style={{ width: '100%' }} placeholder="Enter Online Amount"
                                min={0} precision={2} size="large" prefix="₹" addonBefore={<BankOutlined />}
                              />
                            </Form.Item>
                          </div>
                          <div className="col-md-6">
                            <Form.Item
                              name="loan_dsbrsmnt_amnt_cash"
                              label="Cash Amount"
                              rules={[{ required: true, message: 'Please enter cash amount' }]}
                            >
                              <InputNumber
                                style={{ width: '100%' }} placeholder="Enter Cash Amount"
                                min={0} precision={2} size="large" prefix="₹" addonBefore={<WalletOutlined />}
                              />
                            </Form.Item>
                          </div>
                        </div>
                        <div className="row mb-2">
                          <div className="col-md-6">
                            <Form.Item name="loan_dsbrsmnt_amnt_online_remark" label="Online Payment Remarks">
                              <TextArea
                                placeholder="Enter online payment remarks"
                                autoSize={{ minRows: 2, maxRows: 6 }} allowClear
                              />
                            </Form.Item>
                          </div>
                          <div className="col-md-6">
                            <Form.Item name="loan_dsbrsmnt_amnt_cash_remark" label="Cash Payment Remarks">
                              <TextArea
                                placeholder="Enter cash payment remarks"
                                autoSize={{ minRows: 2, maxRows: 6 }} allowClear
                              />
                            </Form.Item>
                          </div>
                        </div>
                      </>
                    )}

                    {/* ── Total Amount (read-only, live computed) ───────────── */}
                    <div className="row mb-2">
                      <div className="col-md-12">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: '#262626' }}>Total Amount :</span>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: '#1677ff' }}>
                            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── Remark ────────────────────────────────────────────── */}
                    <div className="row mb-2">
                      <div className="col-md-12">
                        <Form.Item name="loan_dsbrsmnt_remark" label="Remarks">
                          <TextArea
                            placeholder="Enter remarks about the loan disbursement"
                            autoSize={{ minRows: 2, maxRows: 6 }}
                            allowClear
                            prefix={<CommentOutlined />}
                          />
                        </Form.Item>
                      </div>
                    </div>

                    <Divider style={{ borderTop: '2px solid #d9d9d9' }} />

                    <div className="text-center mt-4">
                      <Space size="middle">
                        <Button size="large" onClick={() => navigate('/disburse-loan')}>Cancel</Button>
                        <Button type="primary" htmlType="submit" size="large" loading={loading}>
                          {isEditMode ? 'Update Loan' : 'Create Loan'}
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