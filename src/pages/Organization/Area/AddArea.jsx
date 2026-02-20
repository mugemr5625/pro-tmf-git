import { useEffect, useState , useCallback} from "react";
import { Form, Input, Button, Select, notification, Divider, Space, Spin } from "antd";
import { 
  BankOutlined, 
  ApartmentOutlined, 
  EnvironmentOutlined 
} from '@ant-design/icons';
import { ToastContainer } from "react-toastify";
import Loader from "components/Common/Loader";
import { AREA } from "helpers/url_helper";
import { POST, GET,PUT } from "helpers/api_helper";
import { useParams, useNavigate } from "react-router-dom";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, NOTIFICATION_TITLES } from "helpers/errorMessages";
import InputWithAddon from "components/Common/InputWithAddon";
import SelectWithAddon from "components/Common/SelectWithAddon";
import "./AddArea.css";

const { Option } = Select;

const AddArea = () => {
  const [loader, setLoader] = useState(false);
  const [lineList, setLineList] = useState([]);
  const [formData, setFormData] = useState({
    line_id: undefined,
    areaName: "",
    branch_id: "",
  });
  const [branchLoader, setBranchLoader] = useState(false);
  const [lineLoader, setLineLoader] = useState(false);
  const [selectedBranchName, setSelectedBranchName] = useState("");
  const [selectedLineName, setSelectedLineName] = useState("");
  const [form] = Form.useForm();
  const params = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    getBranchName();
  }, []);

  useEffect(() => {
    if (params.id) {
      getAreaDetails();
    }
  }, [params.id]);

  // Fetch lines when branch is selected
  useEffect(() => {
    if (formData?.branch_id) {
      getLineList(formData.branch_id);
    }
  }, [formData?.branch_id]);

  // Fetch branch name from branch_dd API
  const getBranchName = async () => {
    try {
      setBranchLoader(true);
      const selectedBranchId = localStorage.getItem("selected_branch_id");
      
      if (!selectedBranchId) {
        setBranchLoader(false);
        return;
      }

      const response = await GET("api/branch_dd");
      
      if (response?.status === 200 && response?.data) {
        const matchedBranch = response.data.find(
          branch => branch.id === parseInt(selectedBranchId)
        );
        
        if (matchedBranch) {
          setSelectedBranchName(matchedBranch.branch_name);
          setFormData((prev) => ({
            ...prev,
            branch_id: parseInt(selectedBranchId),
          }));
          form.setFieldsValue({ branch_id: parseInt(selectedBranchId) });
        } else {
          notification.warning({
            message: "Branch Not Found",
            description: "The selected branch was not found in the system.",
            duration: 5,
          });
        }
      }
      setBranchLoader(false);
    } catch (error) {
      console.error("Error fetching branch data:", error);
      setBranchLoader(false);
      notification.error({
        message: "Error",
        description: "Failed to fetch branch information.",
        duration: 5,
      });
    }
  };

  const getAreaDetails = useCallback(async () => {
    try {
      setLoader(true);
      const response = await GET(`${AREA}${params.id}`);
      if (response?.status === 200) {
        const areaData = response.data;
        
        setSelectedLineName(areaData.line_name || "");
        
        const updatedData = {
          ...areaData,
          line_id: areaData.line,
          branch_id: areaData.branch,
        };
        
        setFormData(updatedData);
        form.setFieldsValue(updatedData);
      } else {
        setFormData([]);
      }
      setLoader(false);
    } catch (error) {
      setFormData([]);
      setLoader(false);
      console.log(error);
    }
  }, [params.id, form]);

  const getLineList = async (branchId = null) => {
    try {
      setLineLoader(true);
      const response = await GET("api/line_dd");
      
      if (response?.status === 200) {
        if (branchId) {
          const filteredLines = response?.data?.filter(
            (line) => line?.branch_id === branchId
          );
          setLineList(filteredLines);
        } else {
          setLineList(response?.data);
        }
      } else {
        setLineList([]);
      }
      setLineLoader(false);
    } catch (error) {
      setLineList([]);
      setLineLoader(false);
    }
  };

  const onFinish = async () => {
    setLoader(true);
    try {
      let response;
      
      if (params.id) {
        response = await PUT(`${AREA}${params.id}/`, formData);
      } else {
        response = await POST(AREA, formData);
      }

      setLoader(false);
      
      if (response.status >= 400) {
        notification.error({
          message: NOTIFICATION_TITLES.AREA,
          description: params?.id 
            ? ERROR_MESSAGES.AREA.UPDATE_FAILED 
            : ERROR_MESSAGES.AREA.CREATE_FAILED,
          duration: 0,
        });
        return;
      }
      
      setFormData({
        line_id: "",
        areaName: "",
        branch_id: "",
      });
      form.setFieldsValue({
        line_id: "",
        areaName: "",
        branch_id: "",
      });
      
      notification.success({
        message: `${formData?.areaName?.toUpperCase()} ${NOTIFICATION_TITLES.AREA} ${
          params.id ? "Update" : "Create"
        }!`,
        description: params?.id 
          ? SUCCESS_MESSAGES.AREA.UPDATED 
          : SUCCESS_MESSAGES.AREA.CREATED,
        duration: 0,
      });

      navigate(`/area`);
    } catch (error) {
      notification.error({
        message: NOTIFICATION_TITLES.AREA,
        description: ERROR_MESSAGES.AREA.OPERATION_FAILED,
        duration: 0,
      });
    } finally {
      setLoader(false);
    }
  };

  const onValuesChange = (changedValues, allValues) => {
    if (changedValues?.branch_id) {
      setFormData({ ...formData, ...allValues, line_id: "" });
      form.setFieldsValue({ line_id: "" });
      getLineList(allValues.branch_id);
      return;
    }
    setFormData({ ...formData, ...allValues });
  };

  // ── Derived state for line field ──────────────────────────────────────────
  // Branch not yet loaded → disable and show spinner
  // Branch loaded, lines loading → disable and show spinner
  // Branch loaded, lines ready → enable and show ApartmentOutlined
  const isLineDisabled = branchLoader || !formData?.branch_id || lineLoader;
  const lineFieldIcon = (branchLoader || lineLoader)
    ? <Spin size="small" />
    : <ApartmentOutlined />;

  return (
    <>
      {loader && <Loader />}

      <div className="add-area-page-content">
        <div className="add-area-container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="add-area-header">
                <h2 className="add-area-title">
                  {params.id ? "Edit Area" : "Add Area"}
                </h2>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                onValuesChange={onValuesChange}
                initialValues={formData}
                className="add-area-form"
              >
                <div className="container add-area-form-container">
                  {/* Branch and Line */}
                  <div className="row mb-2">

                    {/* ── Branch field ── */}
                    <div className="col-md-6">
                      <Form.Item
                        label="Branch"
                        rules={[
                          {
                            required: true,
                            message: ERROR_MESSAGES.AREA.BRANCH_REQUIRED,
                          },
                        ]}
                      >
                        <InputWithAddon
                          icon={branchLoader ? <Spin size="small" /> : <BankOutlined />}
                          value={branchLoader ? "Loading..." : (selectedBranchName || "No branch selected")}
                          placeholder="No branch selected"
                          disabled
                          style={{
                            backgroundColor: '#f5f5f5',
                            cursor: 'not-allowed',
                            color: branchLoader ? '#999' : '#000',
                          }}
                        />
                      </Form.Item>
                    </div>

                    {/* ── Line field ── */}
                    <div className="col-md-6">
                      {params.id ? (
                        // Edit mode — show line name as read-only text
                        <Form.Item
                          label="Line"
                          rules={[{ required: true, message: ERROR_MESSAGES.AREA.LINE_REQUIRED }]}
                        >
                          <InputWithAddon
                            icon={<ApartmentOutlined />}
                            value={selectedLineName || "Loading..."}
                            disabled
                            style={{
                              backgroundColor: '#f5f5f5',
                              cursor: 'not-allowed',
                              color: '#000',
                            }}
                          />
                        </Form.Item>
                      ) : (
                        // Create mode — dropdown, disabled until branch is loaded
                        // and shows spinner while branch or lines are loading
                        <Form.Item
                          label="Line"
                          name="line_id"
                          rules={[{ required: true, message: ERROR_MESSAGES.AREA.LINE_REQUIRED }]}
                        >
                          <SelectWithAddon
                            icon={lineFieldIcon}
                            placeholder={
                              branchLoader
                                ? "Loading branch..."
                                : lineLoader
                                ? "Loading lines..."
                                : !formData?.branch_id
                                ? "Select a branch first"
                                : "Select Line"
                            }
                            allowClear
                            showSearch
                            size="large"
                            loading={lineLoader}
                            disabled={isLineDisabled}
                            filterOption={(input, option) =>
                              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                          >
                            {lineList?.map((line) => (
                              <Option key={line?.line_id} value={line?.line_id}>
                                {line?.line_name}
                              </Option>
                            ))}
                          </SelectWithAddon>
                        </Form.Item>
                      )}
                    </div>

                  </div>

                  {/* Area Name */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Area Name"
                        name="areaName"
                        rules={[
                          {
                            required: true,
                            message: 'Please enter area name',
                          },
                          { 
                            pattern: /^[A-Za-z][A-Za-z0-9\s-]*$/, 
                            message: 'Area name must start with an alphabet and can contain alphabets, numbers, spaces, and hyphens' 
                          }
                        ]}
                      >
                        <InputWithAddon
                          icon={<EnvironmentOutlined />}
                          placeholder="Enter area name"
                          onValueFilter={(value) => {
                            if (value.length === 0) return '';
                            let filtered = '';
                            for (let i = 0; i < value.length; i++) {
                              if (i === 0) {
                                if (/[A-Za-z]/.test(value[i])) filtered += value[i];
                              } else {
                                if (/[A-Za-z0-9\s-]/.test(value[i])) filtered += value[i];
                              }
                            }
                            return filtered;
                          }}
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="text-center mt-4">
                    <Space size="large">
                      <Button type="primary" htmlType="submit" size="large">
                        {params.id ? "Update Area" : "Add Area"}
                      </Button>
                      <Button size="large" onClick={() => navigate("/area")}>
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

export default AddArea;