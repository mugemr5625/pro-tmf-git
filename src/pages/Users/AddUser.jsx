import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Select, Form, Input, Button, Switch, message, Divider, Space ,Spin,Tooltip,notification} from "antd";
import {
  BankOutlined,
  ApartmentOutlined,
  DollarOutlined,
  PlusOutlined,
  MinusOutlined,
  UserOutlined, PhoneOutlined, MailOutlined,
  LockOutlined,
  EnvironmentOutlined
  
} from "@ant-design/icons";

import {
  USERS,
  EXPANSE_AUTOCOMPLETE,
  AREA, 
  EXPENSE_TYPES, // <-- ADDED: Assuming this is the endpoint for fetching all expense types
} from "helpers/url_helper";
import { GET, POST, PUT } from "helpers/api_helper";
import Loader from "components/Common/Loader";
import InputWithAddon from "components/Common/InputWithAddon";
import SelectWithAddon from "components/Common/SelectWithAddon";
// import { debounce } from "lodash";

const { Option } = Select;

const AddUser = () => {
  const [loading, setLoading] = useState(false);
  const [branchLoader, setBranchLoader] = useState(false);
  const [lineLoader, setLineLoader] = useState(false);
  const [addlBranchList, setAddlBranchList]     = useState([]); // for Base Branch only
const [addlBranchLoader, setAddlBranchLoader] = useState(false);
const [selectedBaseLineId, setSelectedBaseLineId] = useState(null);
const [branchTooltipOpen, setBranchTooltipOpen] = useState(false);
const [lineTooltipOpen, setLineTooltipOpen] = useState(false);

  const [branchList, setBranchList] = useState([]);
  const [lineList, setLineList] = useState([]); // All lines
  const [filteredLineList, setFilteredLineList] = useState([]); // Lines filtered by selected branches
  const [baseLineList, setBaseLineList] = useState([]); // Lines filtered by base branch
  const [isEditMode, setIsEditMode] = useState(false);
  const [initialValues, setInitialValues] = useState({});
  // [MODIFIED] expenseTypes stores the full, active list of expenses
  const [expenseTypes, setExpenseTypes] = useState([]); 
  // const [expenseOptions, setExpenseOptions] = useState([]); // <-- REMOVED: Replaced by expenseTypes
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [expenseMappings, setExpenseMappings] = useState([{ id: Date.now(), lineId: null, expanses: [] }]);
  const [currentUsername, setCurrentUsername] = useState("");
  const [selectedBranches, setSelectedBranches] = useState([]); // Track selected branches (using IDs internally)
  const [selectedBaseBranch, setSelectedBaseBranch] = useState(null); // Track selected base branch
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
const [lineFormDropdownOpen, setLineFormDropdownOpen] = useState(false);

  const navigate = useNavigate();
  const params = useParams();
  const userId = params.id;
  const [form] = Form.useForm();

  // Get logged-in user role and username from localStorage
  useEffect(() => {
    const role = localStorage.getItem("user_role");
    const username = localStorage.getItem("username") || localStorage.getItem("user_name");
    if (role) {
      setUserRole(role);
    }
    if (username) {
      setCurrentUsername(username);
    }
  }, []);

  // [REMOVED] The original debouncedSearch is removed as it conflicts with line-level filtering. 
  // debouncedSearch is not used in the provided context
  

  
 // [NEW] Function to fetch all active expense types (handling pagination)
const getExpenseTypesList = useCallback(async () => {
  setExpenseLoading(true);
  try {
    let allExpenses = [];
    let nextUrl = EXPENSE_TYPES;
    
    // Fetch all pages
    while (nextUrl) {
      const response = await GET(nextUrl);
      
      if (response?.status === 200) {
        // Add results from current page
        const pageResults = response.data.results || [];
        allExpenses = [...allExpenses, ...pageResults];
        
        // Get next page URL
        nextUrl = response.data.next;
        
        // If next URL is a full URL, extract just the path+query
        if (nextUrl && nextUrl.startsWith('http')) {
          const url = new URL(nextUrl);
          nextUrl = url.pathname + url.search;
        }
      } else {
        break;
      }
    }
    
    // Filter for active records only
    const activeExpenses = allExpenses.filter(exp => exp.status === 'active');
    setExpenseTypes(activeExpenses);
    
  } catch (error) {
    console.error("Error fetching expense types:", error);
    message.error("Error fetching expense types");
    setExpenseTypes([]);
  } finally {
    setExpenseLoading(false);
  }
}, []);

  // Fetch area data (which contains branch and line information) AND expense types
 // Fetch branch and line data AND expense types
useEffect(() => {
  const fetchBranchAndLineData = async () => {
    try {
      setBranchLoader(true);
       setAddlBranchLoader(true);
      setLineLoader(true);
      
      // Fetch branches and lines in parallel
      const [branchRes, addlBranchRes, lineRes] = await Promise.all([
        GET("api/branch_dd"),
          GET("api/branch_addl_dd/"),  
        GET("api/line_dd")
      ]);
      

    if (branchRes?.status === 200)     setBranchList(branchRes.data);
        else { message.error("Failed to fetch branches"); setBranchList([]); }
      if (addlBranchRes?.status === 200) setAddlBranchList(addlBranchRes.data);
else { message.error("Failed to fetch base branches"); setAddlBranchList([]); }

       if (lineRes?.status === 200) {
          setLineList(lineRes.data);
          setFilteredLineList(lineRes.data);
        } else {
          message.error("Failed to fetch lines");
          setLineList([]);
          setFilteredLineList([]);
        }

    } catch (error) {
      console.error("Error fetching branch and line data:", error);
      message.error("Failed to load branch and line data");
      setBranchList([]);
      setLineList([]);
    } finally {
      setBranchLoader(false);
      setAddlBranchLoader(false);
      setLineLoader(false);
    }
  };

  fetchBranchAndLineData();
  getExpenseTypesList();
}, [getExpenseTypesList]);
  const fetchLinesByBranch = useCallback(async (branchId) => {
    try {
      const response = await GET(`api/line_dd/?branch_id=${branchId}`);
      if (response?.status === 200) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching lines:", error);
      return [];
    }
  }, []);

  
  // ... (existing handleBranchChange function - no change needed here)
 // ✅ Updated: fetch lines from API for multiple branch selections
  const handleBranchChange = async (selectedBranchIds) => {
    setSelectedBranches(selectedBranchIds);
    form.setFieldsValue({ lineId: [] });
    setFilteredLineList([]);

    if (!selectedBranchIds || selectedBranchIds.length === 0) {
      return;
    }

    setLineLoader(true);
    try {
      // ✅ Fetch lines for ALL selected branches in parallel
      const linePromises = selectedBranchIds.map(branchId =>
        fetchLinesByBranch(branchId)
      );
      const results = await Promise.all(linePromises);

      // ✅ Merge and deduplicate lines from all branches
      const allLines = results.flat();
      const uniqueLines = Array.from(
        new Map(allLines.map(line => [line.line_id, line])).values()
      );

      setFilteredLineList(uniqueLines);
      // ✅ Also update lineList for onFinish payload building
      setLineList(prev => {
        const merged = [...prev, ...uniqueLines];
        return Array.from(new Map(merged.map(l => [l.line_id, l])).values());
      });

      // Clear invalid expense mappings
      const updatedMappings = expenseMappings.map(mapping => {
        if (mapping.lineId && !uniqueLines.some(line => line.line_id === mapping.lineId)) {
          return { ...mapping, lineId: null, expanses: [] };
        }
        return mapping;
      });
      setExpenseMappings(updatedMappings);

    } finally {
      setLineLoader(false);
    }
  };
  // ✅ Updated: fetch lines from API when base branch changes
  const handleBaseBranchChange = async (selectedBranchId) => {
    setSelectedBaseBranch(selectedBranchId);
     setSelectedBaseLineId(null);
    form.setFieldsValue({ baseLineId: null });

    if (!selectedBranchId) {
      setBaseLineList([]);
      return;
    }

    setLineLoader(true);
    try {
      const lines = await fetchLinesByBranch(selectedBranchId);
      setBaseLineList(lines);
    } finally {
      setLineLoader(false);
    }
  };
const expenseMappingLineOptions = useMemo(() => {
  // Always include the selected base line
  const baseLine = baseLineList.filter((l) => l.line_id === selectedBaseLineId);

  if (selectedRole === "owner" || selectedRole === "manager") {
    // Base line + ALL lines from selected branches (filteredLineList), deduped
    const combined = [...filteredLineList, ...baseLine];
    return Array.from(new Map(combined.map((l) => [l.line_id, l])).values());

  } else if (selectedRole === "agent") {
    // Base line + ONLY the specifically selected lines from role assignment
    const selectedLineIds = form.getFieldValue("lineId") || [];
    const agentLines = filteredLineList.filter((l) =>
      selectedLineIds.length > 0
        ? selectedLineIds.includes(l.line_id)
        : expenseMappings.some((m) => m.lineId === l.line_id) // fallback on initial edit load
    );
    const combined = [...agentLines, ...baseLine];
    return Array.from(new Map(combined.map((l) => [l.line_id, l])).values());
  }

  // No role selected yet — just show base line if available
  return baseLine;
}, [
  selectedRole,
  filteredLineList,
  baseLineList,
  selectedBaseLineId,
  form,
  expenseMappings,
]);
// Note: expenseMappings in deps ensures re-compute when mappings change
 useEffect(() => {
    if (userId && branchList.length > 0) { // ✅ No longer depends on lineList.length
      const fetchUserData = async () => {
        try {
          setLoading(true);
          const response = await GET(`${USERS}${userId}/`);
          if (response?.status === 200) {
            const userData = response.data;

            const baseBranchId = userData.base_branch;   // 111
            const baseLineId = userData.base_line;       // 542

            const branchIds = userData.line_allocations
              ? [...new Set(userData.line_allocations.map(a => a.branch))]
              : [];

            const lineIds = userData.line_allocations
              ? [...new Set(userData.line_allocations.map(a => a.line))]
              : [];

            const roleString = userData.role_name?.toLowerCase() || "agent";

            setLineLoader(true);

            // ✅ Fetch base lines and branch lines via API in parallel
            const [baseLines, ...branchLineSets] = await Promise.all([
              fetchLinesByBranch(baseBranchId),
              ...branchIds.map(id => fetchLinesByBranch(id))
            ]);

            setLineLoader(false);

            // ✅ Merge branch lines
            const allBranchLines = branchLineSets.flat();
            const uniqueBranchLines = Array.from(
              new Map(allBranchLines.map(l => [l.line_id, l])).values()
            );

            // ✅ Set dropdown lists
            setBaseLineList(baseLines);
            setFilteredLineList(uniqueBranchLines);
            setSelectedBaseBranch(baseBranchId);
            setSelectedBaseLineId(baseLineId);
            setSelectedBranches(branchIds);
            setSelectedRole(roleString);
            setIsEditMode(true);
            setInitialValues(userData);

            // ✅ Also update lineList for onFinish payload
            const allLines = [...baseLines, ...uniqueBranchLines];
            setLineList(
              Array.from(new Map(allLines.map(l => [l.line_id, l])).values())
            );

            // ✅ Set form values after state settles
            setTimeout(() => {
              form.setFieldsValue({
                full_name: userData.full_name,
                username: userData.username,
                mobile_number: userData.mobile_number,
                email: userData.email,
                address: userData.address,
                pin_code: userData.pin_code,
                role: roleString,
                baseBranchId: baseBranchId,
                baseLineId: baseLineId,
                branchId: branchIds,
                lineId: lineIds,
                allowTransaction: userData.allow_old_transaction,
              });
            }, 100);

            // ✅ Build expense mappings
            if (userData.user_expenses?.length > 0) {
              const expensesByLine = new Map();
              userData.user_expenses.forEach(exp => {
                const lineId = exp.expense_line_id || null;
                if (!expensesByLine.has(lineId)) expensesByLine.set(lineId, []);
                expensesByLine.get(lineId).push(exp.expense);
              });

              const mappings = [];
              expensesByLine.forEach((expenses, lineId) => {
                mappings.push({
                  id: Date.now() + Math.random(),
                  lineId,
                  expanses: [...new Set(expenses)],
                });
              });

              setExpenseMappings(
                mappings.length > 0
                  ? mappings
                  : [{ id: Date.now(), lineId: null, expanses: [] }]
              );
            } else {
              setExpenseMappings([{ id: Date.now(), lineId: null, expanses: [] }]);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          message.error("Failed to load user data");
        } finally {
          setLoading(false);
          setLineLoader(false);
        }
      };

      fetchUserData();
    }
  }, [userId, branchList.length]);
  

  const handleBack = useCallback(() => {
    if (form.isFieldsTouched()) {
      navigate("/user/list");
    }
  }, [navigate, form]);

  // Handle role change to show/hide fields
  const handleRoleChange = (value) => {
    setSelectedRole(value);
    if (value === "owner" || value === "manager") {
      // Clear line field when it's hidden for non-agent roles
      form.setFieldsValue({ lineId: undefined });
    }
  };

  // Add new expense mapping
  const addExpenseMapping = () => {
    setExpenseMappings([...expenseMappings, { id: Date.now(), lineId: null, expanses: [] }]);
  };

  // Remove expense mapping
  const removeExpenseMapping = (index) => {
    if (expenseMappings.length > 1) {
      setExpenseMappings(expenseMappings.filter((_, i) => i !== index));
    } else {
      message.warning("At least one expense mapping is required");
    }
  };

  // [MODIFIED] Update expense mapping: Clear expanses if lineId changes.
  const updateExpenseMapping = (id, field, value) => {
   setExpenseMappings(prevMappings => {
   
    return prevMappings.map(mapping => 
      mapping.id === id 
        ? { ...mapping, [field]: value } 
        : mapping
    );
  });
};
  
  const getFilteredExpenseOptions = useCallback((lineId) => {
    // 1. Get all active expenses from the state
    console.log("Line id selected",lineId)
    const activeExpenses = expenseTypes;
    console.log(expenseTypes)

    // 2. If lineId is null or undefined (Global Mapping)
    if (lineId === null || lineId === undefined) {
      // Show only global expenses (where both branch_id and line_id are null)
      return activeExpenses
        .filter(exp => exp.branch_id === null && exp.line_id === null)
        .map(item => ({ value: item.id, label: item.name, name: item.name }));
    }

    // 3. If a specific lineId is selected
    // Show ONLY expenses that match the lineId (removing the global fallback)
    return activeExpenses
      .filter(exp => exp.line_id === lineId) 
      .map(item => ({ value: item.id, label: item.name, name: item.name }));
  }, [expenseTypes]);
const onFinish = async (values) => {
  if (isEditMode) {
    const hasInvalidMapping = expenseMappings.some(
      (mapping) => !mapping.lineId || mapping.expanses.length === 0
    );
    if (hasInvalidMapping) {
      notification.error({
        message: "Validation Error",
        description: "Please select a line and at least one expense for each mapping.",
        duration: 5,
      });
      return;
    }
  }

  setLoading(true);

  try {
    const orgId = localStorage.getItem("org_id");
    const branchIds = Array.isArray(values.branchId) ? values.branchId : [];
    const lineIds = Array.isArray(values.lineId) ? values.lineId : [];
    const areaIds = Array.isArray(values.areaId) ? values.areaId : [];

    const allExpenseIds = expenseMappings.flatMap(mapping => mapping.expanses || []);

    const payload = {
      username: values.username,
      full_name: values.full_name,
      mobile_number: values.mobile_number,
      email: values.email || "",
      address: values.address || null,
      pin_code: values.pin_code || null,
      role_name: values.role,
      allow_old_transaction: values.allowTransaction || false,
      allow_web_access: false,
      organization: orgId ? Number(orgId) : null,
      baseBranchId: values.baseBranchId,
      baseLineId: values.baseLineId,
      branchId: branchIds,
      lineId: lineIds,
      areaId: areaIds,
      expanses: allExpenseIds,
    };

    if (values.password) {
      payload.password = values.password;
    }

    const fieldLabels = {
      role: "Role",
      role_name: "Role Name",
      username: "Username",
      full_name: "Full Name",
      mobile_number: "Mobile Number",
      email: "Email",
      password: "Password",
      address: "Address",
      pin_code: "Pincode",
      organization: "Organization",
      baseBranchId: "Base Branch",
      baseLineId: "Base Line",
      branchId: "Branch",
      lineId: "Line",
      areaId: "Area",
      expanses: "Expenses",
    };

    const extractErrorMessage = (errors) => {
      if (!errors) return null;
      if (typeof errors === "string") return errors;

      for (const [field, label] of Object.entries(fieldLabels)) {
        if (errors?.[field]) {
          const msg = Array.isArray(errors[field]) ? errors[field][0] : errors[field];
          return `${label}: ${msg}`;
        }
      }

      if (errors?.non_field_errors?.[0]) {
        return errors.non_field_errors[0];
      }

      const firstKey = Object.keys(errors)[0];
      if (firstKey) {
        const msg = Array.isArray(errors[firstKey]) ? errors[firstKey][0] : errors[firstKey];
        return `${firstKey}: ${msg}`;
      }

      return null;
    };

    let response;

    if (isEditMode) {
      response = await PUT(`${USERS}${userId}/`, payload);

      if (response?.status === 200 || response?.status === 201) {
        notification.success({
          message: "Success",
          description: "User updated successfully",
          duration: 5,
        });
        navigate("/user/list");
      } else if (response?.status === 400) {
        const errorMessage = extractErrorMessage(response?.data);
        notification.error({
          message: "Update Failed",
          description: errorMessage || "Failed to update user. Please try again.",
          duration: 5,
        });
      } else {
        notification.error({
          message: "Update Failed",
          description: "Failed to update user. Please try again.",
          duration: 5,
        });
      }

    } else {
      response = await POST(USERS, payload);

      if (response?.status === 200 || response?.status === 201) {
        notification.success({
          message: "Success",
          description: "User added successfully",
          duration: 5,
        });
        form.resetFields();
        setExpenseMappings([{ id: Date.now(), lineId: null, expanses: [] }]);
        navigate("/user/list");
      } else if (response?.status === 400) {
        const errorMessage = extractErrorMessage(response?.data);
        notification.error({
          message: "Creation Failed",
          description: errorMessage || "Failed to create user. Please try again.",
          duration: 5,
        });
      } else {
        notification.error({
          message: "Creation Failed",
          description: "Failed to create user. Please try again.",
          duration: 5,
        });
      }
    }

  } catch (error) {
    console.error("Error adding/updating user:", error);
    notification.error({
      message: "Error",
      description: error?.response?.data?.message || "Failed to add/update user",
      duration: 5,
    });
  } finally {
    setLoading(false);
  }
};
  return (
    <>
      {loading && <Loader />}
      <div className="add-user-page-content">
        <div className="add-user-container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="add-user-header">
                <h2 className="add-user-title">
                  {isEditMode ? "Edit User" : "Add User"}
                </h2>
              </div>

             <Form
  layout="vertical"
  onFinish={onFinish}
  form={form}
  initialValues={initialValues}
  className="add-user-form"
>
  <div className="container add-user-form-container">
    {/* Full Name and User Name */}
    <div className="row mb-2">
      <div className="col-md-6">
     <Form.Item
  label="Full Name"
  name="full_name"
  rules={[
    { required: true, message: "Please enter the full name" },
    {
      pattern: /^[A-Za-z][A-Za-z0-9\- ]*$/,
      message: "First character should be alphabet",
    },
  ]}
>
  <InputWithAddon
    icon={<UserOutlined />}
    placeholder="Enter full name"
    size="large"
    onValueFilter={(value) => {
      if (!value) return "";
      let filtered = "";
      for (let i = 0; i < value.length; i++) {
        if (i === 0) {
          if (/[A-Za-z]/.test(value[i])) filtered += value[i];
        } else {
          if (/[A-Za-z0-9\- ]/.test(value[i])) filtered += value[i];
        }
      }
      return filtered;
    }}
  />
</Form.Item>
      </div>
      <div className="col-md-6">
       <Form.Item
  label="User Name"
  name="username"
  rules={[
    { required: true, message: "Please enter the user name" },
    {
      pattern: /^[A-Za-z][A-Za-z0-9\-]*$/,
      message: "Must start with a letter",
    },
  ]}
>
  <InputWithAddon
    icon={<UserOutlined />}
    placeholder="Enter user name"
    size="large"
    onValueFilter={(value) => {
      if (!value) return "";
      let filtered = "";
      for (let i = 0; i < value.length; i++) {
        if (i === 0) {
          if (/[A-Za-z]/.test(value[i])) filtered += value[i];
        } else {
          if (/[A-Za-z0-9\-]/.test(value[i])) filtered += value[i];  // ← hyphen added
        }
      }
      return filtered;
    }}
  />
</Form.Item>
      </div>
    </div>
         
    {/* Password and Confirm Password */}
    {!isEditMode && (
      <div className="row mb-2">
        <div className="col-md-6">
          <Form.Item
            label="Password"
            name="password"
            rules={[
              {
                required: !isEditMode,
                message: "Please enter the password",
              },
            ]}
          >
            <InputWithAddon
                  icon={<LockOutlined />}
                  placeholder="New password"
                  type="password"
                />
          </Form.Item>
        </div>
        <div className="col-md-6">
          <Form.Item
            label="Confirm Password"
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              {
                required: !isEditMode,
                message: "Please confirm the password",
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value ||
                    getFieldValue("password") === value
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error("Passwords do not match!")
                      );
                },
              }),
            ]}
          >
             <InputWithAddon
                  icon={<LockOutlined />}
                  placeholder="Confirm new password"
                  type="password"
                />
          </Form.Item>
        </div>
      </div>
    )}

    {/* Mobile Number and Email */}
    <div className="row mb-2">
      <div className="col-md-6">
        <Form.Item
          label="Mobile Number"
          name="mobile_number"
          rules={[
            {
              required: true,
              message: "Please enter the mobile number",
            },
            {
              pattern: /^\d{10}$/,
              message: "Mobile number must be 10 digits!",
            },
          ]}
        >
          <InputWithAddon
            icon={<PhoneOutlined />}
            placeholder="Enter mobile number"
            size="large"
            type="text"
            inputMode="decimal"
            onKeyPress={(e) => {
              // Allow only digits
              if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
              }
            }}
            maxLength={10}
          />
        </Form.Item>
      </div>
      <div className="col-md-6">
        <Form.Item
          label="Email ID"
          name="email"
          rules={[
            {
              type: "email",
              message: "Please enter a valid email",
            },
          ]}
        >
          <InputWithAddon
            icon={<MailOutlined />}
            placeholder="Enter email ID"
            size="large"
          />
        </Form.Item>
      </div>
    </div>

    {/* Address and Pincode */}
    <div className="row mb-2">
      <div className="col-md-6">
        <Form.Item label="Address" name="address">
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 6 }}
            placeholder="Enter the address"
            size="large"
            allowClear
          />
        </Form.Item>
      </div>
      <div className="col-md-6">
        <Form.Item
  label="Pincode"
  name="pin_code"
  rules={[
    {
      pattern: /^\d{6}$/,
      message: "Pincode must be 6 digits!",
    },
  ]}
>
  <InputWithAddon
    icon={<EnvironmentOutlined />}
    placeholder="Enter the pincode"
    type="text"
    inputMode="decimal"
    maxLength={6}
    onValueFilter={(value) => value.replace(/\D/g, '').slice(0, 6)}
  />
</Form.Item>
      </div>
    </div>

    <Divider style={{ borderTop: "2px solid #d9d9d9" }} />

    {/* Base Branch and Base Line Section */}
   <Divider 
  orientation="center"
  style={{ 
    borderTopWidth: '3px',
    borderColor: '#d9d9d9'
  }}
>Base Assignment</Divider>
    
    <div className="row mb-2">
      <div className="col-md-6">
        <Form.Item
          label="Base Branch"
          name="baseBranchId"
          rules={[
            { required: true, message: "Please select a base branch" },
          ]}
        >
       <SelectWithAddon
  icon={addlBranchLoader ? <Spin size="small" /> : <BankOutlined />}
  placeholder={addlBranchLoader ? "Loading branches..." : "Select base branch"}
  showSearch
  size="large"
  disabled={addlBranchLoader}
  onChange={handleBaseBranchChange}
   notFoundContent={addlBranchLoader ? <Spin size="small" /> : "No branches available"}
  filterOption={(input, option) =>
    (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
  }
>
  {addlBranchList.map((branch) => (
    <Option key={branch.id} value={branch.id}>
      {branch.branch_name}
    </Option>
  ))}
</SelectWithAddon>
        </Form.Item>
      </div>
      <div className="col-md-6">
        <Form.Item
          label="Base Line"
          name="baseLineId"
          rules={[
            { required: true, message: "Please select a base line" },
          ]}
        >
          <SelectWithAddon
  icon={lineLoader ? <Spin size="small" /> : <ApartmentOutlined />}
  placeholder={
    !selectedBaseBranch
      ? "Select base branch first"
      : lineLoader
      ? "Loading lines..."
      : "Select base line"
  }
   notFoundContent={
    !selectedBaseBranch
      ? "Select a base branch first"
      : lineLoader
      ? <Spin size="small" />
      : "No lines available for selected branch"
  }
  showSearch
  size="large"
  disabled={!selectedBaseBranch || lineLoader}
  onChange={(value) => setSelectedBaseLineId(value)}
  filterOption={(input, option) =>
    (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
  }
>
  {baseLineList.map((option) => (
    <Option key={option.line_id} value={option.line_id}>
      {option.line_name}
    </Option>
  ))}
</SelectWithAddon>
        </Form.Item>
      </div>
    </div>

    <Divider style={{ borderTop: "2px solid #d9d9d9" }} />

    {/* User Role & Assignment Section */}
   <Divider 
  orientation="center"
  style={{ 
    borderTopWidth: '3px',
    borderColor: '#d9d9d9'
  }}
>User Role & Assignment</Divider>
    
    <div className="row mb-2">
      <div className="col-md-6">
        <Form.Item
          label="Role"
          name="role"
          rules={[
            { required: true, message: "Please select a role" },
          ]}
        >
          <SelectWithAddon
            icon={<UserOutlined />}
            placeholder="Choose User Role"
            showSearch
            size="large"
            onChange={handleRoleChange}
             filterOption={(input, option) =>
    (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
  }
          >
            <Option value="owner">Owner</Option>
            <Option value="manager">Manager</Option>
            <Option value="agent">Agent</Option>
          </SelectWithAddon>
        </Form.Item>
      </div>
      <div className="col-md-6">
  <Form.Item
    label="Branch"
    name="branchId"
    rules={[
      { required: true, message: "Please select a branch" },
    ]}
  >
   <SelectWithAddon
  icon={branchLoader ? <Spin size="small" /> : <BankOutlined />}
  placeholder={branchLoader ? "Loading branches..." : "Select branch"}
  showSearch
  size="large"
  disabled={branchLoader}
  mode="multiple"
  allowClear
  onChange={handleBranchChange}
  open={branchDropdownOpen}
  onDropdownVisibleChange={(open) => setBranchDropdownOpen(open)}
   notFoundContent={branchLoader ? <Spin size="small" /> : "No branches available"}
  maxTagCount={1}
  maxTagTextLength={10}
  maxTagPlaceholder={(omittedValues) => (
  <Tooltip
    open={branchTooltipOpen}
    onOpenChange={(open) => setBranchTooltipOpen(open)}
    title={
      <div onMouseDown={(e) => e.stopPropagation()}> 
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold' }}>Selected Branches ({omittedValues.length + 1}):</span>
          <span
           onMouseDown={(e) => e.stopPropagation()}  
            onClick={(e) => { e.stopPropagation(); setBranchTooltipOpen(false); }}
            style={{ cursor: 'pointer', marginLeft: '8px', color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
          >✕</span>
        </div>
        {selectedBranches.map((id) => {
          const branch = branchList.find(b => b.id === id);
          return branch ? <div key={id}>• {branch.branch_name}</div> : null;
        })}
      </div>
    }
    placement="bottom"
    trigger="click"
  >
    <span
      onClick={(e) => { e.stopPropagation(); setBranchTooltipOpen(!branchTooltipOpen); }}
      style={{ cursor: 'pointer', color: '#1890ff' }}
    >
      +{omittedValues.length} more
    </span>
  </Tooltip>
)}
  filterOption={(input, option) =>
    (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
  }
  dropdownRender={(menu) => (
    <>
      {menu}
      <div style={{ padding: '4px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'center' }}>
        <Button style={{ background: "#28a745", color: "white" }} size="small" onClick={() => setBranchDropdownOpen(false)}>
          Select Done ✓
        </Button>
      </div>
    </>
  )}
>
  {branchList?.map((branch) => (
    <Option key={branch.id} value={branch.id}>
      {branch.branch_name}
    </Option>
  ))}
</SelectWithAddon>
  </Form.Item>
</div>
    </div>

    {selectedRole && selectedRole === "agent" && (
      <div className="row mb-2">
       <div className="col-md-6">
  <Form.Item
    label="Line"
    name="lineId"
    rules={[
      { required: true, message: "Please select a line" },
    ]}
  >
  <SelectWithAddon
  icon={lineLoader ? <Spin size="small" /> : <ApartmentOutlined />}
  placeholder={
    lineLoader
      ? "Loading lines..."
      : selectedBranches.length > 0
      ? "Select Line"
      : "Select branches first"
  }
  showSearch
  size="large"
  disabled={!selectedBranches || selectedBranches.length === 0 || lineLoader}
  mode="multiple"
  allowClear
  open={lineFormDropdownOpen}
  onDropdownVisibleChange={(open) => setLineFormDropdownOpen(open)}
   notFoundContent={
    selectedBranches.length === 0
      ? "Select branches first"
      : lineLoader
      ? <Spin size="small" />
      : "No lines available for selected branches"
  }
  maxTagCount={1}
  maxTagTextLength={10}
  maxTagPlaceholder={(omittedValues) => {
  const selectedLineIds = form.getFieldValue("lineId") || [];
  return (
    <Tooltip
      open={lineTooltipOpen}
      onOpenChange={(open) => setLineTooltipOpen(open)}
      title={
         <div onMouseDown={(e) => e.stopPropagation()}> 
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>Selected Lines ({omittedValues.length + 1}):</span>
            <span
             onMouseDown={(e) => e.stopPropagation()}  
              onClick={(e) => { e.stopPropagation(); setLineTooltipOpen(false); }}
              style={{ cursor: 'pointer', marginLeft: '8px', color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
            >✕</span>
          </div>
          {selectedLineIds.map((id) => {
            const line = filteredLineList.find(l => l.line_id === id);
            return line ? <div key={id}>• {line.line_name}</div> : null;
          })}
        </div>
      }
      placement="bottom"
      trigger="click"
    >
      <span
        onClick={(e) => { e.stopPropagation(); setLineTooltipOpen(!lineTooltipOpen); }}
        style={{ cursor: 'pointer', color: '#1890ff' }}
      >
        +{omittedValues.length} more
      </span>
    </Tooltip>
  );
}}
  filterOption={(input, option) =>
    (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
  }
  dropdownRender={(menu) => (
    <>
      {menu}
      <div style={{ padding: '4px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'center' }}>
        <Button style={{ background: "#28a745", color: "white" }} size="small" onClick={() => setLineFormDropdownOpen(false)}>
          Select Done ✓
        </Button>
      </div>
    </>
  )}
>
  {filteredLineList.map((option) => (
    <Option key={option.line_id} value={option.line_id}>
      {option.line_name}
    </Option>
  ))}
</SelectWithAddon>
  </Form.Item>
</div>
        <div className="col-md-6">
          <Form.Item
            label="Allow to see old Transaction?"
            name="allowTransaction"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="Yes"
              unCheckedChildren="No"
              defaultChecked
            />
          </Form.Item>
        </div>
      </div>
    )}

    {selectedRole && (selectedRole === "owner" || selectedRole === "manager") && (
      <div className="row mb-2">
        <div className="col-md-6">
          <Form.Item
            label="Allow to see old Transaction?"
            name="allowTransaction"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="Yes"
              unCheckedChildren="No"
              defaultChecked
            />
          </Form.Item>
        </div>
      </div>
    )}
  
  

    {/* User Expense Mapping Section */}
    {isEditMode && (
      <>
        <Divider style={{ borderTop: "2px solid #d9d9d9" }} />
       <Divider 
  orientation="center"
  style={{ 
    borderTopWidth: '3px',
    borderColor: '#d9d9d9'
  }}
>User Expense Mapping</Divider>
        
        {expenseMappings.map((mapping, index) => (
          <div key={mapping.id} className="row mb-4">
            {expenseMappings.length > 1 && (
             <Divider 
  orientation="center"
  style={{ 
    borderTopWidth: '3px',
    borderColor: '#d9d9d9'
  }}
>
                {`Expense Mapping ${index + 1}`}
              </Divider>
            )}
            
            {/* Line Name field */}
            <div className="col-md-6">
              <Form.Item
                label="Line Name"
                rules={
                  (selectedRole === 'agent' || mapping.lineId !== null)
                  ? [{ required: true, message: "Please select a line" }]
                  : []
                }
              > 
              <SelectWithAddon
  icon={lineLoader ? <Spin size="small" /> : <ApartmentOutlined />}
  placeholder={
    lineLoader
      ? "Loading lines..."
      : expenseMappingLineOptions.length > 0
      ? "Select Line"
      : "No lines available — select branches/base branch first"
  }
   notFoundContent={
    lineLoader
      ? <Spin size="small" />
      : "No lines available — select branches/base branch first"
  }
  showSearch
  size="large"
  disabled={expenseMappingLineOptions.length === 0 || lineLoader}
  value={mapping.lineId}
  onChange={(value) => updateExpenseMapping(mapping.id, "lineId", value)}
  filterOption={(input, option) =>
    (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
  }
>
  {expenseMappingLineOptions.map((option) => (
    <Option key={option.line_id} value={option.line_id}>
      {option.line_name}
    </Option>
  ))}
</SelectWithAddon>
              </Form.Item>
            </div>
            
            {/* User Expense Type field */}
            <div className="col-md-6">
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <Form.Item
                  label="User Expense Type"
                  required
                  style={{ flexGrow: 1 }}
                >
                 <SelectWithAddon
  icon={expenseLoading ? <Spin size="small" /> : <DollarOutlined />}
  mode="multiple"
  placeholder={expenseLoading ? "Loading expenses..." : "Search and select expenses"}
  value={mapping.expanses}
  onChange={(value) => updateExpenseMapping(mapping.id, 'expanses', value)}
  filterOption={(input, option) => {
    if (!input) return true;
    const searchText = option?.children ?? option?.name ?? "";
    return searchText.toLowerCase().includes(input.toLowerCase());
  }}
  disabled={expenseLoading}
  showSearch
  allowClear
  size="large"
  notFoundContent="No expenses found"
>
  {getFilteredExpenseOptions(mapping.lineId).map((option) => (
    <Option key={option.value} value={option.value} name={option.name}>
      {option.label}
    </Option>
  ))}
</SelectWithAddon>
                </Form.Item>

                {/* Minus Button */}
                {expenseMappings.length > 1 && (
                  <Button
                    type="primary"
                    danger
                    shape="circle"
                    icon={<MinusOutlined />}
                    onClick={() => removeExpenseMapping(index)}
                    style={{
                      width: 33,
                      height: 33,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#ff4d4f",
                      borderColor: "#ff4d4f",
                      color: "#fff",
                      marginTop: "30px",
                      flexShrink: 0
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
       
        {/* Add button at the bottom */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-15px" }}>
          <Button
            type="primary"
            shape="circle"
            icon={<PlusOutlined />}
            onClick={addExpenseMapping}
            style={{
              width: 35,
              height: 35,
              backgroundColor: "#28a745",
              borderColor: "#28a745",
              color: "#fff",
            }}
          />
        </div>

       
      </>
    )}

    {/* Form Actions */}
    <div className="text-center mt-4">
      <Space size="large">
        <Button type="primary" htmlType="submit" loading={loading} size="large">
          {isEditMode ? "Update User" : "Add User"}
        </Button>
        <Button
          size="large"
          onClick={handleBack}
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
      </div>
    </>
  );
};

export default AddUser;