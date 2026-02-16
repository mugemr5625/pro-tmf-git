import React, { useState, useEffect } from 'react';
import {
  Button,
  Checkbox,
  Collapse,
  Tabs,
  List,
  Tag,
  Divider,
  Skeleton,
  Modal,
  Dropdown,
  Menu,
  FloatButton,
  notification,
  Typography,
  Row,
  Col,
  Space,
  Card,
  Grid,
  Image,
  Popconfirm,
  Form,
  Input,
  Select,
  DatePicker,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  EllipsisOutlined,
  PlusOutlined,
  UpOutlined,
  DownOutlined,
  DeleteFilled,
  ExclamationCircleOutlined,
  SwapOutlined,
  EditOutlined,
  ApartmentOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useNavigate } from 'react-router-dom';
import { GET } from 'helpers/api_helper';
import { DISBURSE_LOAN } from 'helpers/url_helper';
import Loader from 'components/Common/Loader';
import SwipeablePanel from 'components/Common/SwipeablePanel';
import LoanCollapseContent from 'components/Common/LoanCollapseContent';
import SelectWithAddon from 'components/Common/SelectWithAddon';
import './DisburseLoanList.css';

const { Panel } = Collapse;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const LoanDisbursementList = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState([]);
  const [displayedLoans, setDisplayedLoans] = useState([]);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [activeTab, setActiveTab] = useState('pay');
  const [accordionOpen, setAccordionOpen] = useState(true);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [expandedCustomers, setExpandedCustomers] = useState({});
  const [loanSelectionModalVisible, setLoanSelectionModalVisible] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState(null);
  const [loanSelectionForm] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [lineDropdownList, setLineDropdownList] = useState([]);
  const [areaDropdownList, setAreaDropdownList] = useState([]);
  const [filteredAreaList, setFilteredAreaList] = useState([]);
  const [lineLoading, setLineLoading] = useState(false);
  const [areaLoading, setAreaLoading] = useState(false);
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState(null);
  
  // New state for search criteria
  const [searchCriteria, setSearchCriteria] = useState({
    date: null,
    lineId: null,
    areaIds: [],
  });
  const [isSearchApplied, setIsSearchApplied] = useState(false);
  
  // Pagination state for infinite scroll
  const [pagination, setPagination] = useState({
    displayed: 10,
    total: 0,
  });
  const PAGE_SIZE = 10;

  const hasMoreData = pagination.displayed < pagination.total;

  // Show search modal on component mount
  useEffect(() => {
    setSearchModalVisible(true);
  }, []);

  // Fetch Line and Area dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setLineLoading(true);
        
        const lineResponse = await GET("api/line_dd");

        if (lineResponse?.status === 200) {
          setLineDropdownList(lineResponse.data);
        } else {
          notification.error({ message: "Failed to fetch lines" });
          setLineDropdownList([]);
        }
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
        notification.error({ message: "Failed to load dropdown data" });
        setLineDropdownList([]);
      } finally {
        setLineLoading(false);
      }
    };

    fetchDropdownData();
  }, []);

  // Fetch loan data only when search is applied
  useEffect(() => {
    if (isSearchApplied) {
      fetchLoanData();
    }
  }, [isSearchApplied, searchCriteria]);

  useEffect(() => {
    filterCustomers();
  }, [showAllCustomers, loans]);

  const fetchLoanData = async () => {
    try {
      setLoading(true);
      
      // Fetch all loan data without query parameters
      const response = await GET(DISBURSE_LOAN);
      
      if (response?.status === 200 && response.data) {
        // Process all data first
        const allCustomers = processApiDataAndReturn(response.data);
        
        // Filter based on search criteria
        const filteredCustomers = filterBySearchCriteria(allCustomers);
        
        if (filteredCustomers.length === 0) {
          notification.info({
            message: 'No Records Found',
            description: 'No loan disbursements found for the selected criteria.',
          });
        }
        
        setLoans(filteredCustomers);
        setPagination({
          displayed: Math.min(PAGE_SIZE, filteredCustomers.length),
          total: filteredCustomers.length,
        });
      } else {
        // No data found
        setLoans([]);
        setPagination({
          displayed: 0,
          total: 0,
        });
        notification.info({
          message: 'No Records Found',
          description: 'No loan disbursements found.',
        });
      }
    } catch (error) {
      console.error('Error fetching loan data:', error);
      notification.error({
        message: 'Error',
        description: 'Failed to fetch loan data. Please try again.',
      });
      setLoans([]);
      setPagination({
        displayed: 0,
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const processApiDataAndReturn = (apiData) => {
    // Group loans by customer
    const customerMap = {};
    
    apiData.forEach(loan => {
      const custId = loan.loan_dsbrsmnt_cust_id || loan.LOAN_DSBRSMNT_CUST_ID;
      
      if (!customerMap[custId]) {
        customerMap[custId] = {
          id: custId,
          customerId: loan.LOAN_DSBRSMNT_CUST_CD,
          customerName: loan.LOAN_DSBRSMNT_CUST_NM,
          LOAN_DSBRSMNT_CUST_ID: custId,
          LOAN_DSBRSMNT_CUST_CD: loan.LOAN_DSBRSMNT_CUST_CD,
          LOAN_DSBRSMNT_CUST_NM: loan.LOAN_DSBRSMNT_CUST_NM,
          LOAN_DSBRSMNT_CUST_ORDR: loan.LOAN_DSBRSMNT_CUST_ORDR,
          LOAN_DSBRSMNT_BRNCH_NM: loan.LOAN_DSBRSMNT_BRNCH_NM,
          LOAN_DSBRSMNT_LINE_NM: loan.LOAN_DSBRSMNT_LINE_NM,
          LOAN_DSBRSMNT_AREA_NM: loan.LOAN_DSBRSMNT_AREA_NM,
          LOAN_DSBRSMNT_LINE_ID: loan.LOAN_DSBRSMNT_LINE_ID || loan.loan_dsbrsmnt_line_id,
          LOAN_DSBRSMNT_AREA_ID: loan.LOAN_DSBRSMNT_AREA_ID || loan.loan_dsbrsmnt_area_id,
          loans: []
        };
      }
      
      // Add complete loan object to the customer's loans array
      customerMap[custId].loans.push({
        id: loan.id,
        loan_account_number: loan.loan_account_number,
        loan_account_code: loan.loan_account_code,
        loan_dsbrsmnt_repmnt_type: loan.loan_dsbrsmnt_repmnt_type,
        loan_dsbrsmnt_amnt: loan.loan_dsbrsmnt_amnt,
        loan_dsbrsmnt_intrst_amnt: loan.loan_dsbrsmnt_intrst_amnt,
        loan_dsbrsmnt_tot_instlmnt: loan.loan_dsbrsmnt_tot_instlmnt,
        loan_dsbrsmnt_prcsng_fee_amnt: loan.loan_dsbrsmnt_prcsng_fee_amnt,
        loan_dsbrsmnt_instlmnt_amnt: loan.loan_dsbrsmnt_instlmnt_amnt,
        loan_dsbrsmnt_dflt_pay_amnt: loan.loan_dsbrsmnt_dflt_pay_amnt,
        loan_dsbrsmnt_bad_loan_days: loan.loan_dsbrsmnt_bad_loan_days,
        loan_dsbrsmnt_mode: loan.loan_dsbrsmnt_mode,
        loan_dsbrsmnt_comnt: loan.loan_dsbrsmnt_comnt,
        loan_dsbrsmnt_dt: loan.loan_dsbrsmnt_dt,
        loan_dsbrsmnt_status: loan.loan_dsbrsmnt_status,
        loan_dsbrsmnt_created_ts: loan.loan_dsbrsmnt_created_ts,
        loan_dsbrsmnt_updtd_ts: loan.loan_dsbrsmnt_updtd_ts,
        LOAN_DSBRSMNT_CREATED_BY_NM: loan.LOAN_DSBRSMNT_CREATED_BY_NM,
        LOAN_DSBRSMNT_CREATED_BY_FULL_NM: loan.LOAN_DSBRSMNT_CREATED_BY_FULL_NM,
        LOAN_DSBRSMNT_UPDTD_BY_NM: loan.LOAN_DSBRSMNT_UPDTD_BY_NM,
        LOAN_DSBRSMNT_UPDTD_BY_FULL_NM: loan.LOAN_DSBRSMNT_UPDTD_BY_FULL_NM,
        LOAN_DSBRSMNT_LINE_ID: loan.LOAN_DSBRSMNT_LINE_ID || loan.loan_dsbrsmnt_line_id,
        LOAN_DSBRSMNT_AREA_ID: loan.LOAN_DSBRSMNT_AREA_ID || loan.loan_dsbrsmnt_area_id,
        // Also keep simplified field names for compatibility
        loanAccountNumber: loan.loan_account_number,
        loanAmount: loan.loan_dsbrsmnt_amnt,
      });
    });
    
    return Object.values(customerMap);
  };

  const filterBySearchCriteria = (customers) => {
    let filtered = [...customers];
    
    // Filter by line ID
    if (searchCriteria.lineId) {
      filtered = filtered.filter(customer => {
        const customerLineId = customer.LOAN_DSBRSMNT_LINE_ID;
        return String(customerLineId) === String(searchCriteria.lineId);
      });
    }
    
    // Filter by area IDs (customer must match at least one selected area)
    if (searchCriteria.areaIds && searchCriteria.areaIds.length > 0) {
      filtered = filtered.filter(customer => {
        const customerAreaId = customer.LOAN_DSBRSMNT_AREA_ID;
        return searchCriteria.areaIds.some(areaId => 
          String(customerAreaId) === String(areaId)
        );
      });
    }
    
    // Filter by date if needed (you can add date filtering logic here)
    // if (searchCriteria.date) {
    //   filtered = filtered.filter(customer => {
    //     // Add your date filtering logic
    //   });
    // }
    
    return filtered;
  };

  const filterCustomers = () => {
    let filtered = [...loans];
    
    if (!showAllCustomers) {
      // Show only customers with loans
      filtered = filtered.filter(customer => customer.loans && customer.loans.length > 0);
    }
    
    setDisplayedLoans(filtered);
    setPagination({
      displayed: Math.min(PAGE_SIZE, filtered.length),
      total: filtered.length,
    });
  };

  const loadMoreCustomers = () => {
    setPagination(prev => ({
      ...prev,
      displayed: Math.min(prev.displayed + PAGE_SIZE, prev.total),
    }));
  };

  // Handle line selection to filter areas
  const handleLineChange = async (lineId) => {
    setSelectedLineId(lineId);
    searchForm.setFieldsValue({ areaIds: [] }); // Clear area selection
    
    if (!lineId) {
      setFilteredAreaList([]);
      return;
    }

    try {
      setAreaLoading(true);
      const response = await GET(`api/area_dd?line_id=${lineId}`);
      
      if (response?.status === 200) {
        setFilteredAreaList(response.data);
      } else {
        notification.error({ message: "Failed to fetch areas" });
        setFilteredAreaList([]);
      }
    } catch (error) {
      console.error("Error:", error);
      setFilteredAreaList([]);
    } finally {
      setAreaLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    searchForm.validateFields()
      .then((values) => {
        console.log('Search values:', values);
        
        // Format date if needed
        const formattedDate = values.date ? values.date.format('YYYY-MM-DD') : null;
        
        // Update search criteria
        setSearchCriteria({
          date: formattedDate,
          lineId: values.lineId,
          areaIds: values.areaIds || [],
        });
        
        setIsSearchApplied(true);
        setSearchModalVisible(false);
        
        notification.success({
          message: 'Search Applied',
          description: 'Loading loan disbursements...',
        });
      })
      .catch((info) => {
        console.log('Validation Failed:', info);
      });
  };

  const handleSearchCancel = () => {
    if (!isSearchApplied) {
      notification.warning({
        message: 'Search Required',
        description: 'Please complete the search to view loan disbursements.',
      });
      return;
    }
    setSearchModalVisible(false);
    searchForm.resetFields();
    setSelectedLineId(null);
    setFilteredAreaList([]);
  };
 
  const handleAddLoan = (customer) => {
    const customerId = customer.LOAN_DSBRSMNT_CUST_ID || customer.id;
    const customerCode = customer.LOAN_DSBRSMNT_CUST_CD || customer.customerId;
    const customerName = customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM;
    
    notification.info({
      message: 'Add New Loan',
      description: `Opening loan disbursement form for ${customerName}`,
    });
    
    // Navigate to add new loan with customer details
    navigate(`/new-loan-disbursement/add`, {
      state: {
        mode: 'add',
        customerId: customerId,
        customerCode: customerCode,
        customerName: customerName,
      }
    });
  };

  const handleCustomerClick = (customer) => {
    notification.info({
      message: 'Customer Details',
      description: `Viewing details for ${customer.customerName}`,
    });
  };

  const handleSwipeStateChange = (customerId, isOpen) => {
    if (isOpen) {
      setOpenSwipeId(customerId);
    } else if (openSwipeId === customerId) {
      setOpenSwipeId(null);
    }
  };

  const handleExpandToggle = (customer) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [customer.id]: !prev[customer.id]
    }));
  };

  const handleMenuClick = (action, customer) => {
    if (action === 'Edit') {
      handleEditCustomer(customer);
    } else if (action === 'View') {
      handleViewCustomer(customer);
    } else {
      notification.info({
        message: action,
        description: `Action ${action} for ${customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM}`,
      });
    }
  };

  const handleEditCustomer = (customer) => {
    const customerId = customer.LOAN_DSBRSMNT_CUST_ID || customer.id;
    const customerName = customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM;
    const loans = customer.loans || [];
    
    // If customer has no loans
    if (loans.length === 0) {
      notification.warning({
        message: 'No Loans to Edit',
        description: `${customerName} has no active loans.`,
      });
      return;
    }
    
    // If customer has 1 loan - edit directly
    if (loans.length === 1) {
      const loan = loans[0];
      notification.info({
        message: 'Edit Loan',
        description: `Opening edit form for ${customerName}`,
      });
      
      navigate(`/new-loan-disbursement/${loan.id}`, {
        state: {
          mode: 'edit',
          customerId: customerId,
          customerName: customerName,
          loanData: loan,
        }
      });
      return;
    }
    
    // If customer has 2 loans - show improved selection modal
    setSelectedCustomerForEdit(customer);
    setLoanSelectionModalVisible(true);
    loanSelectionForm.resetFields();
  };

  const handleLoanSelectionOk = () => {
    loanSelectionForm.validateFields()
      .then((values) => {
        const customer = selectedCustomerForEdit;
        const customerId = customer.LOAN_DSBRSMNT_CUST_ID || customer.id;
        const customerName = customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM;
        const loans = customer.loans || [];
        
        // Get selected loan by ID from dropdown
        const selectedLoan = loans.find(l => String(l.id) === String(values.loanSelection));
        
        if (selectedLoan) {
          notification.info({
            message: 'Edit Loan',
            description: `Opening edit form for ${selectedLoan.loanAccountNumber || selectedLoan.loan_account_number}`,
          });
          
          navigate(`/new-loan-disbursement/${selectedLoan.id}`, {
            state: {
              mode: 'edit',
              customerId: customerId,
              customerName: customerName,
              loanData: selectedLoan,
            }
          });
          
          setLoanSelectionModalVisible(false);
          loanSelectionForm.resetFields();
          setSelectedCustomerForEdit(null);
        }
      })
      .catch((info) => {
        console.log('Validation Failed:', info);
      });
  };

  const handleLoanSelectionCancel = () => {
    setLoanSelectionModalVisible(false);
    loanSelectionForm.resetFields();
    setSelectedCustomerForEdit(null);
  };

  const handleViewCustomer = (customer) => {
    // Toggle expand to view details
    handleExpandToggle(customer);
  };

  const onDelete = async (customer) => {
    try {
      const customerId = customer.LOAN_DSBRSMNT_CUST_ID || customer.id;
      const customerName = customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM;
      
      // Here you would typically call a DELETE API
      // const response = await DELETE(`/api/loan-disbursement/${customerId}/`);
      
      // For now, just update the UI
      const updatedLoans = loans.filter(c => c.id !== customer.id);
      setLoans(updatedLoans);
      
      notification.success({
        message: 'Loan Deleted',
        description: `Loan for ${customerName} has been removed successfully.`,
        duration: 3,
      });
      
    } catch (error) {
      notification.error({
        message: 'Delete Failed',
        description: 'Failed to delete the loan. Please try again.',
        duration: 3,
      });
    }
  };

  const renderCustomerMenu = (customer) => (
    <Menu>
      <Menu.Item key="view" onClick={() => handleMenuClick('View', customer)}>
        <div className="d-flex align-items-center gap-1">
          <span className="mdi mdi-eye text-secondary"></span>
          <span>View Details</span>
        </div>
      </Menu.Item>
      <Menu.Item key="edit" onClick={() => handleMenuClick('Edit', customer)}>
        <div className="d-flex align-items-center gap-1">
          <span className="mdi mdi-pencil text-secondary"></span>
          <span>Edit</span>
        </div>
      </Menu.Item>
      <Menu.Item key="delete">
        <Popconfirm
          title={`Delete loan for ${customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM}?`}
          description="Are you sure you want to delete this loan permanently?"
          icon={<ExclamationCircleOutlined style={{ color: "red" }} />}
          onConfirm={(e) => {
            e.stopPropagation();
            onDelete(customer);
          }}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true, type: "primary" }}
          cancelButtonProps={{ type: "default" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="d-flex align-items-center gap-1" style={{ color: "red" }}>
            <DeleteFilled style={{ color: "red" }} />
            <span>Delete</span>
          </div>
        </Popconfirm>
      </Menu.Item>
    </Menu>
  );

  const renderLoanItem = (customer, index) => {
    const hasLoans = customer.loans && customer.loans.length > 0;
    const loanCount = customer.loans?.length || 0;

    // Mobile view with SwipeablePanel
    if (isMobile) {
      const isExpanded = expandedCustomers[customer.id];
      
      return (
        <div key={customer.id} className="loan-mobile-item-wrapper" style={{ marginBottom: '12px' }}>
          <div style={{ position: 'relative' }}>
            <SwipeablePanel
              item={{ ...customer, lineIndex: index + 1 }}
              titleKey="customerName"
              subtitleKey="customerId"
              onSwipeRight={!isExpanded ? () => handleEditCustomer(customer) : undefined}
              onSwipeLeft={!isExpanded ? () => onDelete(customer) : undefined}
              isSwipeOpen={openSwipeId === customer.id}
              onSwipeStateChange={(isOpen) => handleSwipeStateChange(customer.id, isOpen)}
              isExpanded={isExpanded}
              onExpandToggle={() => handleExpandToggle(customer)}
              renderContent={() => (
                <LoanCollapseContent 
                  customer={customer} 
                  loans={customer.loans || []}
                />
              )}
            />
            
            {/* Right-side Add Button - Hide when swipe is open, expanded, or has 2+ loans */}
            {loanCount < 2 && !isExpanded && openSwipeId !== customer.id && (
              <Button
                type="primary"
                shape="circle"
                icon={<PlusOutlined />}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddLoan(customer);
                }}
                className="loan-add-button"
                style={{
                  position: 'absolute',
                  right: '40px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  backgroundColor: '#28a745',
                  borderColor: '#28a745',
                }}
              />
            )}
          </div>
        </div>
      );
    }

    // Desktop view
    return (
      <div key={customer.id} className="loan-customer-list-item-wrapper">
        <List.Item className={expandedCustomers[customer.id] ? "loan-customer-list-item loan-list-item-expanded" : "loan-customer-list-item"}>
          <List.Item.Meta
            avatar={
              <div className="loan-customer-index-badge">
                {index + 1}
              </div>
            }
            title={
              <div className="loan-customer-title-container">
                <div onClick={() => handleExpandToggle(customer)} style={{ flex: 1, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="loan-customer-name">
                        {customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM}
                      </span>
                      <span className="loan-customer-id">
                        ID: {customer.customerId || customer.LOAN_DSBRSMNT_CUST_CD}
                      </span>
                    </div>
                    {hasLoans ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        {customer.loans.map((loan, idx) => (
                          <div key={idx} style={{ fontSize: '13px', color: '#595959', fontFamily: 'monospace' }}>
                            {idx + 1}. {loan.loanAccountNumber || loan.loan_account_number} - ₹
                            {parseFloat(loan.loanAmount || loan.loan_dsbrsmnt_amnt).toLocaleString()}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Tag color="orange" style={{ width: 'fit-content' }}>No active loans</Tag>
                    )}
                  </div>
                </div>
                <div className="loan-customer-actions">
                  {loanCount < 2 && (
                    <Button
                      type="primary"
                      shape="circle"
                      icon={<PlusOutlined />}
                      size="small"
                      className="loan-add-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddLoan(customer);
                      }}
                      style={{
                        backgroundColor: '#28a745',
                        borderColor: '#28a745',
                      }}
                    />
                  )}
                  <Dropdown overlay={renderCustomerMenu(customer)} trigger={['click']}>
                    <EllipsisOutlined
                      className="loan-ellipsis-icon"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                </div>
              </div>
            }
          />
        </List.Item>
        
        {/* Expandable Content Section for Desktop */}
        {expandedCustomers[customer.id] && (
          <div className="loan-collapse-content" style={{ padding: '16px', background: '#fafafa' }}>
            <LoanCollapseContent 
              customer={customer} 
              loans={customer.loans || []}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="loan-page-content">
      {loading && <Loader />}

      {/* Header */}
      <div className="loan-disbursement-header-container loan-disbursement-header">
        <h2 className="loan-disbursement-title">Loan Disbursement</h2>
        <div className="loan-disbursement-actions">
          <Button
            icon={<SwapOutlined rotate={90} />}
            onClick={() => notification.info({ message: 'Reorder feature coming soon!' })}
            type="default"
            className="loan-action-btn"
          >
            {!isMobile && "Reorder"}
          </Button>
          <Button
            icon={<SearchOutlined />}
            onClick={() => setSearchModalVisible(true)}
            type="default"
            className="loan-action-btn"
          >
            {!isMobile && "Search"}
          </Button>
          <Button
            icon={<FilterOutlined />}
            onClick={() => setFilterModalVisible(true)}
            type="default"
            className="loan-action-btn"
          >
            {!isMobile && "Filter"}
          </Button>
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item key="export">
                  <div className="d-flex align-items-center gap-1">
                    <span className="mdi mdi-export text-secondary"></span>
                    <span>Export Data</span>
                  </div>
                </Menu.Item>
                <Menu.Item key="settings">
                  <div className="d-flex align-items-center gap-1">
                    <span className="mdi mdi-cog text-secondary"></span>
                    <span>Settings</span>
                  </div>
                </Menu.Item>
              </Menu>
            }
            trigger={['click']}
          >
            <Button 
              icon={<EllipsisOutlined rotate={90} />} 
              type="default"
              className="loan-action-btn"
            />
          </Dropdown>
        </div>
      </div>

      {/* Accordion Summary - Single Line Layout */}
      {isSearchApplied && (
        <Card
          className="loan-accordion-card mb-3"
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Collapse
            activeKey={accordionOpen ? ['summary'] : []}
            onChange={() => setAccordionOpen(!accordionOpen)}
            expandIconPosition='end'
            expandIcon={({ isActive }) => (isActive ? <UpOutlined /> : <DownOutlined />)}
            style={{ border: 'none', background: 'transparent' }}
          >
            <Panel
              header={
                <Row justify="space-between" align="middle" style={{ width: '100%' }}>
                  <Col>
                    <Text strong style={{ fontSize: '16px' }}>
                      Date: {searchCriteria.date || '03/02/2026'}
                    </Text>
                  </Col>
                  <Col>
                    <Text strong style={{ fontSize: '16px' }}>
                      Bal: <span style={{ fontSize: '18px' }}>284303</span>
                    </Text>
                  </Col>
                </Row>
              }
              key="summary"
              style={{ border: 'none' }}
            >
              <Row gutter={[12, 8]} style={{ marginTop: '8px', padding: '0 12px 8px 12px' }}>
                <Col xs={12} sm={8} md={4}>
                  <div className="summary-stat-compact">
                    <Text type="secondary" style={{ fontSize: '14px' }}>O.Bal: </Text>
                    <Text strong style={{ fontSize: '16px', color: '#10b981' }}>284303</Text>
                  </div>
                </Col>
                <Col xs={12} sm={8} md={4}>
                  <div className="summary-stat-compact">
                    <Text type="secondary" style={{ fontSize: '14px' }}>T: </Text>
                    <Text strong style={{ fontSize: '16px', color: '#ef4444' }}>10</Text>
                  </div>
                </Col>
                <Col xs={12} sm={8} md={4}>
                  <div className="summary-stat-compact">
                    <Text type="secondary" style={{ fontSize: '14px' }}>Bill: </Text>
                    <Text strong style={{ fontSize: '16px' }}>0</Text>
                  </div>
                </Col>
                <Col xs={12} sm={8} md={4}>
                  <div className="summary-stat-compact">
                    <Text type="secondary" style={{ fontSize: '14px' }}>Expense: </Text>
                    <Text strong style={{ fontSize: '16px', color: '#ef4444' }}>0</Text>
                  </div>
                </Col>
                <Col xs={12} sm={8} md={4}>
                  <div className="summary-stat-compact">
                    <Text type="secondary" style={{ fontSize: '14px' }}>Coll: </Text>
                    <Text strong style={{ fontSize: '16px' }}>0</Text>
                  </div>
                </Col>
                <Col xs={12} sm={8} md={4}>
                  <div className="summary-stat-compact">
                    <Text type="secondary" style={{ fontSize: '14px' }}>Loan: </Text>
                    <Text strong style={{ fontSize: '16px', color: '#ef4444' }}>0</Text>
                  </div>
                </Col>
              </Row>
            </Panel>
          </Collapse>
        </Card>
      )}

      {/* Tabs */}
      {isSearchApplied && (
        <Card
          className="loan-tabs-card"
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            centered
            style={{ paddingLeft: '8px' }}
          >
            <Tabs.TabPane tab="DISBURSE" key="pay">
              {/* Show All Customers Checkbox */}
              <div style={{ marginBottom: '16px' }}>
                <Checkbox
                  checked={showAllCustomers}
                  onChange={(e) => setShowAllCustomers(e.target.checked)}
                >
                  Show All Customers
                </Checkbox>
              </div>

              {/* Customer List */}
              <div id="scrollableDiv" className="loan-scrollable-div">
                <InfiniteScroll
                  dataLength={pagination.displayed}
                  next={loadMoreCustomers}
                  hasMore={hasMoreData}
                  loader={
                    <div className="loan-skeleton-container">
                      <Skeleton avatar paragraph={{ rows: 2 }} active />
                    </div>
                  }
                  endMessage={
                    displayedLoans.length > 0 && (
                      <Divider plain className="loan-divider-container">
                        <span className="loan-divider-star">★ </span>
                        <span className="loan-divider-text">End of List</span>
                        <span className="loan-divider-star"> ★</span>
                      </Divider>
                    )
                  }
                  scrollableTarget="scrollableDiv"
                >
                  <List
                    dataSource={displayedLoans.slice(0, pagination.displayed)}
                    renderItem={renderLoanItem}
                  />
                </InfiniteScroll>

                {displayedLoans.length === 0 && !loading && (
                  <div className="loan-no-data">
                    <Text type="secondary" style={{ fontSize: '16px' }}>
                      {showAllCustomers
                        ? 'No customers found'
                        : 'No customers with active loans'}
                    </Text>
                  </div>
                )}
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab="COLLECT" key="collect">
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <Text type="secondary" style={{ fontSize: '16px', fontStyle: 'italic' }}>
                  Collection feature coming soon...
                </Text>
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab="COMPLETED" key="completed">
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <Text type="secondary" style={{ fontSize: '16px', fontStyle: 'italic' }}>
                  Completed loans will appear here...
                </Text>
              </div>
            </Tabs.TabPane>
          </Tabs>
        </Card>
      )}

      {/* Empty State - Show when search is not applied */}
      {!isSearchApplied && !searchModalVisible && (
        <Card style={{ textAlign: 'center', padding: '60px 20px', marginTop: '20px' }}>
          <SearchOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px' }} />
          <Title level={4} type="secondary">No Search Applied</Title>
          <Text type="secondary">Please use the search feature to view loan disbursements.</Text>
          <br />
          <Button 
            type="primary" 
            icon={<SearchOutlined />}
            onClick={() => setSearchModalVisible(true)}
            style={{ marginTop: '16px' }}
          >
            Open Search
          </Button>
        </Card>
      )}

      {/* Search Modal */}
      <Modal
        title={null}
        open={searchModalVisible}
        onCancel={handleSearchCancel}
        onOk={handleSearchSubmit}
        width={600}
        centered
        okText="Search"
        cancelText={isSearchApplied ? "Cancel" : null}
        closable={isSearchApplied}
        maskClosable={isSearchApplied}
        keyboard={isSearchApplied}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
            Search Loans
          </h3>
          {!isSearchApplied && (
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Please complete search to view loan disbursements
            </Text>
          )}
        </div>
        
        <Form
          form={searchForm}
          layout="vertical"
        >
          <Form.Item
            name="date"
            label="Date"
            rules={[
              {
                required: true,
                message: "Please select a date",
              },
            ]}
          >
            <DatePicker
              style={{ width: "100%" }}
              placeholder="Select Date"
              format="YYYY-MM-DD"
              size="large"
              suffixIcon={<CalendarOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="lineId"
            label="Line"
            rules={[
              {
                required: true,
                message: "Please select a line",
              },
            ]}
          >
            <SelectWithAddon
              icon={<ApartmentOutlined />}
              placeholder="Select Line"
              showSearch
              size="large"
              loading={lineLoading}
              onChange={handleLineChange}
              notFoundContent={
                lineLoading ? <Spin size="small" /> : "No lines found"
              }
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {lineDropdownList.map((line) => (
                <Select.Option key={line.line_id} value={line.line_id}>
                  {line.line_name}
                </Select.Option>
              ))}
            </SelectWithAddon>
          </Form.Item>

          <Form.Item
            name="areaIds"
            label="Area"
            rules={[
              {
                required: true,
                message: "Please select at least one area",
              },
            ]}
          >
            <SelectWithAddon
              icon={<EnvironmentOutlined />}
              placeholder={selectedLineId ? "Select Areas" : "Select Line first"}
              showSearch
              size="large"
              mode="multiple"
              loading={areaLoading}
              disabled={!selectedLineId}
              allowClear
              notFoundContent={
                areaLoading ? <Spin size="small" /> : "No areas found"
              }
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              open={areaDropdownOpen}
              onDropdownVisibleChange={(open) => setAreaDropdownOpen(open)}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div
                    style={{
                      padding: '4px',
                      borderTop: '1px solid #f0f0f0',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <Button
                      style={{ background: "#28a745", color: "white" }}
                      size="small"
                      onClick={() => setAreaDropdownOpen(false)}
                    >
                      Select Done ✓
                    </Button>
                  </div>
                </>
              )}
            >
              {filteredAreaList.map((area) => (
                <Select.Option key={area.id} value={area.id}>
                  {area.areaName}
                </Select.Option>
              ))}
            </SelectWithAddon>
          </Form.Item>
        </Form>
      </Modal>

      {/* Filter Modal */}
      <Modal
        title={<div className="loan-search-modal-title">Filter Options</div>}
        open={filterModalVisible}
        onCancel={() => setFilterModalVisible(false)}
        footer={null}
      >
        <p className="loan-search-modal-label">Filter by loan status, amount, date, etc.</p>
      </Modal>

      {/* Loan Selection Modal */}
      <Modal
        title={null}
        open={loanSelectionModalVisible}
        onOk={handleLoanSelectionOk}
        onCancel={handleLoanSelectionCancel}
        width={500}
        centered
        okText="Select"
        cancelText="Cancel"
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
            Select Loan to Edit
          </h3>
        </div>
        
        <Form
          form={loanSelectionForm}
          layout="vertical"
        >
          <Form.Item
            name="loanSelection"
            label="Select Loan"
            rules={[
              {
                required: true,
                message: "Please select a loan",
              },
            ]}
          >
            <Select
              size="large"
              placeholder="Choose a loan"
              allowClear
            >
              {selectedCustomerForEdit?.loans?.map((loan, idx) => (
                <Select.Option key={loan.id} value={loan.id}>
                  {loan.loanAccountNumber || loan.loan_account_number}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LoanDisbursementList;