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

const INVESTMENT_TYPES_DD_API = "/api/investmenttype_dd/";

const AddInvestment = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [lineList, setLineList] = useState([]);
  const [investmentTitles, setInvestmentTitles] = useState([]);
  const [investment, setInvestment] = useState(null);
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  // ── Pre-selected line from localStorage (used in add mode only) ───────────
  const [preselectedLineId, setPreselectedLineId] = useState(null);

  // ── Loading states ────────────────────────────────────────────────────────
  const [lineLoading, setLineLoading] = useState(false);
  const [titleLoading, setTitleLoading] = useState(false);

  // ── Fetch branch id and saved line id from localStorage ───────────────────
  const getBranchId = async () => {
    try {
      const storedBranchId = localStorage.getItem("selected_branch_id");
      const storedLineId = localStorage.getItem("selected_line_id");

      if (!storedBranchId) return;

      let branchId;
      try {
        branchId = JSON.parse(storedBranchId);
      } catch {
        branchId = storedBranchId;
      }

      setSelectedBranchId(parseInt(branchId));

      // Only pre-select line in add mode
      if (!params.id && storedLineId) {
        setPreselectedLineId(parseInt(storedLineId));
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }
  };

  // ── Fetch lines by branch_id ──────────────────────────────────────────────
  const getLineList = async (branchId) => {
    setLineLoading(true);
    try {
      const response = await GET(`api/line_dd/?branch_id=${branchId}`);
      if (response?.status === 200 && response?.data) {
        setLineList(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error("Error fetching line data:", error);
      notification.error({ message: "Error", description: "Failed to fetch line information." });
    } finally {
      setLineLoading(false);
    }
  };

  // ── Fetch investment titles by line_id ────────────────────────────────────
  const getInvestmentTitles = async (lineId) => {
    setTitleLoading(true);
    setInvestmentTitles([]);
    form.setFieldsValue({ investment_title_id: undefined });
    try {
      const response = await GET(`${INVESTMENT_TYPES_DD_API}?line_id=${lineId}`);
      if (response?.status === 200) {
        const results = Array.isArray(response.data) ? response.data : response.data?.results || [];
        setInvestmentTitles(results);
      }
    } catch (error) {
      console.error("Error fetching investment titles:", error);
      notification.error({ message: "Error", description: "Failed to fetch investment titles." });
    } finally {
      setTitleLoading(false);
    }
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      await getBranchId();
      if (params.id) {
        const res = await getDetails(INVESTMENT, params.id);
        setInvestment(res);
      } else {
        setLoading(false);
      }
    };
    init();
  }, [params.id]);

  useEffect(() => {
    if (selectedBranchId) {
      getLineList(selectedBranchId);
    }
  }, [selectedBranchId]);

  // ── Auto-fill line from localStorage when lines are loaded (add mode only) ─
  useEffect(() => {
    if (!params.id && preselectedLineId && lineList.length > 0) {
      const lineExists = lineList.some(l => l.line_id === preselectedLineId);
      if (lineExists) {
        form.setFieldsValue({ line: preselectedLineId });
        getInvestmentTitles(preselectedLineId);
      }
    }
  }, [preselectedLineId, lineList]);

  // ── Set form values when editing ──────────────────────────────────────────
  useEffect(() => {
    if (params.id && investment) {
      const lineId = investment.line;
      if (lineId) {
        getInvestmentTitles(lineId).then(() => {
          form.setFieldsValue(investment);
          setLoading(false);
        });
      } else {
        form.setFieldsValue(investment);
        setLoading(false);
      }
    }
  }, [investment]);

  // ── Handle line change (manual selection) ─────────────────────────────────
  const handleLineChange = (lineId) => {
    form.setFieldsValue({ investment_title_id: undefined });
    setInvestmentTitles([]);
    if (lineId) {
      getInvestmentTitles(lineId);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
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
      } else if (response?.status === 400 || response?.status >= 500) {
        const errData = response?.data || {};
        const errMsg =
          errData.investment_title_id?.[0] ||
          errData.line?.[0] ||
          errData.detail ||
          Object.values(errData).flat().join(", ") ||
          (params.id
            ? "Failed to update the investment. Please try again."
            : "Failed to create the investment. Please try again.");
        notification.error({
          message: params.id
            ? ERROR_MESSAGES.INVESTMENT.UPDATE_FAILED
            : ERROR_MESSAGES.INVESTMENT.ADD_FAILED,
          description: errMsg,
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
      notification.error({
        message: ERROR_MESSAGES.INVESTMENT.OPERATION_ERROR,
        description: error?.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Derived: line field state ─────────────────────────────────────────────
  const isLineDisabled = lineLoading || !selectedBranchId;
  const lineFieldIcon = lineLoading ? <Spin size="small" /> : <ApartmentOutlined />;

  // In add mode, if a line was saved in localStorage — lock the field
  const isLinePreselected = !params.id && !!preselectedLineId;

  // ── Render ────────────────────────────────────────────────────────────────
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

                  {/* Row 1: Line Name + Investment Title */}
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
                            lineLoading
                              ? "Loading lines..."
                              : !selectedBranchId
                              ? "No branch selected"
                              : "Select Line"
                          }
                          allowClear={!isLinePreselected}
                          showSearch
                          size="large"
                          // Disable if: lines still loading, no branch, OR line is pre-filled from localStorage
                          disabled={isLineDisabled || isLinePreselected}
                          onChange={handleLineChange}
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
                          placeholder={
                            titleLoading
                              ? "Loading titles..."
                              : !form.getFieldValue("line")
                              ? "Select a line first"
                              : investmentTitles.length === 0
                              ? "No titles available"
                              : "Select Investment Title"
                          }
                          allowClear
                          showSearch
                          size="large"
                          disabled={titleLoading || !form.getFieldValue("line")}
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

                  </div>

                  {/* Row 2: Investment Amount + Payment Mode */}
                  <div className="row mb-2">

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

                  </div>

                  {/* Row 3: Date of Investment */}
                  <div className="row mb-2">

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