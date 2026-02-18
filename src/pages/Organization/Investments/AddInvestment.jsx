import { Button, Form, Input, Select, notification, Space, Spin } from "antd";
import Loader from "components/Common/Loader";
import PAYMENT_MODES_OPTIONS from "constants/payment_modes";
import { POST, PUT, GET } from "helpers/api_helper";
import { getDetails } from "helpers/getters";
import { INVESTMENT } from "helpers/url_helper";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, NOTIFICATION_TITLES } from "helpers/errorMessages";
import { Fragment, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import {
  BankOutlined,
  ApartmentOutlined,
  DollarOutlined,
  CreditCardOutlined,
  CalendarOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import InputWithAddon from "components/Common/InputWithAddon";
import SelectWithAddon from "components/Common/SelectWithAddon";
import "./AddInvestment.css";

const { Option } = Select;

const INVESTMENT_TYPES_API = "/api/investmenttypes/";

const AddInvestment = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [branchList, setBranchList] = useState(null);
  const [lineList, setLineList] = useState(null);
  const [allLines, setAllLines] = useState(null);
  const [investmentTitles, setInvestmentTitles] = useState([]);
  const [investment, setInvestment] = useState(null);
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  // ─── Loading states ───────────────────────────────────────────────────────
  const [branchLoading, setBranchLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [titleLoading, setTitleLoading] = useState(false);

  // ─── Fetch branch from localStorage + branch_dd ───────────────────────────
  const getBranchName = async () => {
    setBranchLoading(true);
    try {
      const storedBranchId = localStorage.getItem("selected_branch_id");
      if (!storedBranchId) { setBranchLoading(false); return; }

      const response = await GET("api/branch_dd");
      if (response?.status === 200 && response?.data) {
        setBranchList(response.data);
        const matchedBranch = response.data.find(
          (branch) => branch.id === parseInt(storedBranchId)
        );
        if (matchedBranch) {
          setSelectedBranchId(matchedBranch.id); // already an int from API
        }
      }
    } catch (error) {
      console.error("Error fetching branch data:", error);
      notification.error({ message: "Error", description: "Failed to fetch branch information." });
    } finally {
      setBranchLoading(false);
    }
  };

  // ─── Fetch lines by branch_id ─────────────────────────────────────────────
  const getLineList = async (branchId) => {
    setLineLoading(true);
    try {
      const response = await GET(`api/line_dd/?branch_id=${branchId}`);
      if (response?.status === 200 && response?.data) {
        const lines = Array.isArray(response.data) ? response.data : [];
        setAllLines(lines);
        setLineList(lines);
      }
    } catch (error) {
      console.error("Error fetching line data:", error);
      notification.error({ message: "Error", description: "Failed to fetch line information." });
    } finally {
      setLineLoading(false);
    }
  };

  // ─── Fetch investment titles ──────────────────────────────────────────────
  const getInvestmentTitles = async () => {
    setTitleLoading(true);
    try {
      const response = await GET(INVESTMENT_TYPES_API);
      if (response?.status === 200) {
        const results = response.data?.results || response.data || [];
        setInvestmentTitles(results);
      }
    } catch (error) {
      console.error("Error fetching investment titles:", error);
      notification.error({ message: "Error", description: "Failed to fetch investment titles." });
    } finally {
      setTitleLoading(false);
    }
  };

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    getBranchName();
    getInvestmentTitles();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      getLineList(selectedBranchId);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    if (params.id) {
      getDetails(INVESTMENT, params.id).then((res) => {
        setInvestment(res);
      });
    }
  }, [params.id]);

  // Set form values once all data is ready
  useEffect(() => {
    if (
      branchList != null &&
      allLines != null &&
      (params.id == null || investment != null)
    ) {
      if (investment && investment.branch) {
        setSelectedBranchId(investment.branch);
        const filteredLines = allLines.filter(
          (line) => line.branch_id === investment.branch
        );
        setLineList(filteredLines);
        setTimeout(() => {
          form.setFieldsValue(investment);
          setLoading(false);
        }, 100);
      } else {
        if (selectedBranchId) {
          form.setFieldsValue({ branch: selectedBranchId });
        }
        setLoading(false);
      }
    }
  }, [branchList, allLines, params.id, investment, form, selectedBranchId]);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        investment_title_id: values.investment_title_id,
        branch: selectedBranchId,
        line: values.line,
        investment_amount: values.investment_amount,
        payment_mode: values.payment_mode,
        investment_date: values.investment_date,
        comments: values.comments,
      };

      const titleObj = investmentTitles.find((t) => t.id === values.investment_title_id);
      const titleName = titleObj?.investment_title || "Investment";

      let response;
      if (params.id) {
        response = await PUT(`${INVESTMENT}${params.id}/`, payload);
      } else {
        response = await POST(INVESTMENT, payload);
      }

      if (response?.status === 200 || response?.status === 201) {
        notification.success({
          message: `${titleName.toUpperCase()} ${NOTIFICATION_TITLES.INVESTMENT} ${
            params.id ? "updated" : "added"
          }!`,
          description: params.id
            ? SUCCESS_MESSAGES.INVESTMENT.UPDATED
            : SUCCESS_MESSAGES.INVESTMENT.CREATED,
        });
        navigate("/investment");
      } else {
        notification.error({
          message: params.id
            ? ERROR_MESSAGES.INVESTMENT.UPDATE_FAILED
            : ERROR_MESSAGES.INVESTMENT.ADD_FAILED,
          description: response?.message || response?.data?.message || "Please try again",
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
      notification.error({
        message: ERROR_MESSAGES.INVESTMENT.OPERATION_ERROR,
        description: error?.message || "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Derived: branch display name ─────────────────────────────────────────
  const branchDisplayName = branchLoading
    ? "Loading..."
    : branchList?.find((b) => b.id === selectedBranchId)?.branch_name || "No branch selected";

  // ─── Derived: line field state ────────────────────────────────────────────
  const isLineDisabled = branchLoading || lineLoading || !selectedBranchId;
  const lineFieldIcon = branchLoading || lineLoading
    ? <Spin size="small" />
    : <ApartmentOutlined />;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Fragment>
      {loading && <Loader />}

      <div className="add-investment-page-content">
        <div className="add-investment-container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="add-investment-header">
                <h2 className="add-investment-title">
                  {params.id ? "Edit Investment" : "Add Investment"}
                </h2>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                className="add-investment-form"
              >
                <div className="container add-investment-form-container">

                  {/* Row 1: Investment Title + Branch */}
                  <div className="row mb-2">

                    {/* ── Investment Title ── */}
                    <div className="col-md-6">
                      <Form.Item
                        label="Investment Title"
                        name="investment_title_id"
                        rules={[
                          { required: true, message: "Please select an investment title" },
                        ]}
                      >
                        <SelectWithAddon
                          icon={titleLoading ? <Spin size="small" /> : <DollarOutlined />}
                          placeholder={titleLoading ? "Loading titles..." : "Select Investment Title"}
                          allowClear
                          showSearch
                          size="large"
                          disabled={titleLoading}
                          filterOption={(input, option) =>
                            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                          }
                        >
                          {investmentTitles.map((title) => (
                            <Option key={title.id} value={title.id}>
                              {title.investment_title}
                            </Option>
                          ))}
                        </SelectWithAddon>
                      </Form.Item>
                    </div>

                    {/* ── Branch — preselected, read-only ── */}
                    {/* ── Branch — preselected, read-only ── */}
<div className="col-md-6">
  {/* Hidden field keeps the branch ID in the form store for validation */}
  <Form.Item
    name="branch"
    rules={[
      { required: true, message: ERROR_MESSAGES.INVESTMENT.BRANCH_REQUIRED },
    ]}
    style={{ display: "none" }}
  >
    <Input type="hidden" />
  </Form.Item>

  {/* Visual display — NOT controlled by Form, so branchDisplayName always wins */}
  <Form.Item label="Branch Name">
    <InputWithAddon
      icon={branchLoading ? <Spin size="small" /> : <BankOutlined />}
      value={branchDisplayName}
      placeholder="No branch selected"
      disabled
      style={{
        backgroundColor: '#f5f5f5',
        cursor: 'not-allowed',
        color: branchLoading ? '#999' : '#000',
      }}
    />
  </Form.Item>
</div>

                  </div>

                  {/* Row 2: Line + Investment Amount */}
                  <div className="row mb-2">

                    {/* ── Line ── */}
                    <div className="col-md-6">
                      <Form.Item
                        label="Line Name"
                        name="line"
                        rules={[
                          { required: true, message: ERROR_MESSAGES.INVESTMENT.LINE_REQUIRED },
                        ]}
                      >
                        <SelectWithAddon
                          icon={lineFieldIcon}
                          placeholder={
                            branchLoading
                              ? "Loading branch..."
                              : lineLoading
                              ? "Loading lines..."
                              : !selectedBranchId
                              ? "Select a branch first"
                              : "Select Line"
                          }
                          allowClear
                          showSearch
                          size="large"
                          disabled={isLineDisabled}
                          filterOption={(input, option) =>
                            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                          }
                        >
                          {lineList?.map((line) => (
                            <Option key={line.line_id} value={line.line_id}>
                              {line.line_name}
                            </Option>
                          ))}
                        </SelectWithAddon>
                      </Form.Item>
                    </div>

                    {/* ── Investment Amount ── */}
                    <div className="col-md-6">
                      <Form.Item
                        label="Investment Amount"
                        name="investment_amount"
                        rules={[
                          { required: true, message: ERROR_MESSAGES.INVESTMENT.AMOUNT_REQUIRED },
                          {
                            type: "number",
                            min: 1,
                            message: ERROR_MESSAGES.INVESTMENT.AMOUNT_MIN,
                            transform: (value) => Number(value),
                          },
                        ]}
                      >
                        <InputWithAddon
                          icon={<WalletOutlined />}
                          type="text"
                          inputMode="decimal"
                          placeholder="Enter Investment Amount"
                          size="large"
                        />
                      </Form.Item>
                    </div>

                  </div>

                  {/* Row 3: Payment Mode + Date */}
                  <div className="row mb-2">

                    {/* ── Payment Mode ── */}
                    <div className="col-md-6">
                      <Form.Item
                        label="Payment Mode"
                        name="payment_mode"
                        rules={[
                          { required: true, message: ERROR_MESSAGES.INVESTMENT.PAYMENT_MODE_REQUIRED },
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

                    {/* ── Date ── */}
                    <div className="col-md-6">
                      <Form.Item
                        label="Date of Investment"
                        name="investment_date"
                        rules={[
                          { required: true, message: ERROR_MESSAGES.INVESTMENT.DATE_REQUIRED },
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

                  </div>

                  {/* Row 4: Comments */}
                  <div className="row mb-2">
                    <div className="col-md-12">
                      <Form.Item label="Comment" name="comments">
                        <Input.TextArea
                          placeholder="Enter Comment"
                          size="large"
                          autoSize={{ minRows: 2, maxRows: 6 }}
                          allowClear
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="text-center mt-4">
                    <Space size="large">
                      <Button type="primary" htmlType="submit" size="large">
                        {params.id ? "Update Investment" : "Add Investment"}
                      </Button>
                      <Button size="large" onClick={() => navigate("/investment")}>
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
    </Fragment>
  );
};

export default AddInvestment;