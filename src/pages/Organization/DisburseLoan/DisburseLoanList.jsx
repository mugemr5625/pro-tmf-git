import React, { useState, useEffect } from 'react';
import {
  Button, Checkbox, Collapse, Tabs, List, Tag, Divider, Skeleton, Modal,
  Dropdown, Menu, notification, Typography, Row, Col, Space, Card, Grid,
  Popconfirm, Form, Select, Spin, DatePicker,
} from 'antd';
import {
  FilterOutlined, EllipsisOutlined, PlusOutlined, DeleteFilled,
  ExclamationCircleOutlined, SwapOutlined, SearchOutlined,
  ApartmentOutlined, EnvironmentOutlined, CalendarOutlined,
} from '@ant-design/icons';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useNavigate } from 'react-router-dom';
import { GET } from 'helpers/api_helper';
import Loader from 'components/Common/Loader';
import SwipeablePanel from 'components/Common/SwipeablePanel';
import CompletedLoanCollapseContent from 'components/Common/CompletedLoanCollapseContent';
import LoanCollapseContent from 'components/Common/LoanCollapseContent';
import SelectWithAddon from 'components/Common/SelectWithAddon';
import './DisburseLoanList.css';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const LoanDisbursementList = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();

  // ── Loading states ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [allActiveLoading, setAllActiveLoading] = useState(false);
  const [expandLoading, setExpandLoading] = useState(false);

  // ── Data states ─────────────────────────────────────────────────────────────
  const [loanToBeCompleted, setLoanToBeCompleted] = useState([]);
  const [allActiveLoans, setAllActiveLoans] = useState([]);
  const [disburseLoanMap, setDisburseLoanMap] = useState({});
  const [disburseLoanFetched, setDisburseLoanFetched] = useState(false);
  const [completedLoans, setCompletedLoans] = useState([]);

  // ── Display / pagination ────────────────────────────────────────────────────
  const [displayedLoanToBeCompleted, setDisplayedLoanToBeCompleted] = useState([]);
  const [displayedAllActive, setDisplayedAllActive] = useState([]);
  const [displayedCompleted, setDisplayedCompleted] = useState([]);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [activeTab, setActiveTab] = useState('pay');

  const PAGE_SIZE = 10;
  const [pagination, setPagination] = useState({ displayed: 10, total: 0 });
  const [allActivePagination, setAllActivePagination] = useState({ displayed: 10, total: 0 });
  const [completedPagination, setCompletedPagination] = useState({ displayed: 10, total: 0 });

  // ── Fetched flags ───────────────────────────────────────────────────────────
  const [loanToBeCompletedFetched, setLoanToBeCompletedFetched] = useState(false);
  const [allActiveFetched, setAllActiveFetched] = useState(false);
  const [completedFetched, setCompletedFetched] = useState(false);

  // ── UI states ───────────────────────────────────────────────────────────────
  const [accordionOpen, setAccordionOpen] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [openCompletedSwipeId, setOpenCompletedSwipeId] = useState(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [expandedCompletedCustomerId, setExpandedCompletedCustomerId] = useState(null);
  const [loanSelectionModalVisible, setLoanSelectionModalVisible] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState(null);
  const [lastScrollY, setLastScrollY] = useState(0);

  // ── Search states ───────────────────────────────────────────────────────────
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [lineDropdownList, setLineDropdownList] = useState([]);
  const [filteredAreaList, setFilteredAreaList] = useState([]);
  const [lineLoading, setLineLoading] = useState(false);
  const [areaLoading, setAreaLoading] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState(null);

  // ── Applied search values (committed after Search) ──────────────────────────
  const [appliedDate, setAppliedDate] = useState(null);
  const [appliedLineName, setAppliedLineName] = useState(null);
  const [appliedAreaName, setAppliedAreaName] = useState(null);
  const [appliedAreaId, setAppliedAreaId] = useState(null);   // ← NEW
  const [showSearchReset, setShowSearchReset] = useState(false);

  // ── Form instances ──────────────────────────────────────────────────────────
  const [loanSelectionForm] = Form.useForm();
  const [searchForm] = Form.useForm();

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const mapLoanMode = (mode) => {
    if (mode === 1 || mode === '1') return 'Cash';
    if (mode === 2 || mode === '2') return 'Online';
    if (mode === 3 || mode === '3') return 'Both';
    if (typeof mode === 'string') return mode;
    return 'Cash';
  };

  const getLastNonZeroDigits = (acc, n = 6) => {
    if (!acc) return '';
    return String(acc).slice(-n).replace(/^0+/, '') || '0';
  };

  const getMaskedAccountNumber = (acc) => {
    if (!acc) return '';
    const s = String(acc), last5 = s.slice(-5);
    const vis = last5.replace(/^0+/, '') || last5.slice(-1);
    return 'x'.repeat(s.length - vis.length) + vis;
  };

  // ── On mount: fetch loan-to-be-completed + line dropdown + open search modal ─
  useEffect(() => {
    // Restore last saved values from localStorage
    const savedLineId   = localStorage.getItem('selected_line_id');
    const savedAreaId   = localStorage.getItem('selected_area_id');
    const savedLineName = localStorage.getItem('selected_line_name');
    const savedAreaName = localStorage.getItem('selected_area_name');
    const savedDate     = localStorage.getItem('selected_search_date');

    if (savedLineName) setAppliedLineName(savedLineName);
    if (savedAreaName) setAppliedAreaName(savedAreaName);
    if (savedDate)     setAppliedDate(savedDate);

    // Parse saved area_id for API calls
    const areaIdParam = savedAreaId
      ? (isNaN(savedAreaId) ? savedAreaId : Number(savedAreaId))
      : null;

    if (areaIdParam) setAppliedAreaId(areaIdParam);
    if (savedLineName || savedAreaName || savedDate) setShowSearchReset(true);

    fetchLoanToBeCompleted(areaIdParam);   // ← pass saved area_id
    fetchLineDropdown();
    fetchAllDisburseLoans();

    // Always open search modal on landing
    openSearchModalWithSavedValues(savedLineId, savedAreaId, savedDate);
  }, []);

  // ── Helper: open search modal and pre-populate from localStorage ─────────────
  const openSearchModalWithSavedValues = async (savedLineId, savedAreaId, savedDate) => {
    if (savedLineId) {
      const parsedLineId = isNaN(savedLineId) ? savedLineId : Number(savedLineId);
      setSelectedLineId(parsedLineId);
      searchForm.setFieldsValue({ lineId: parsedLineId });
      try {
        setAreaLoading(true);
        const response = await GET(`api/area_dd?line_id=${parsedLineId}`);
        if (response?.status === 200) setFilteredAreaList(response.data);
      } catch (error) {
        console.error('Error fetching areas on modal open:', error);
      } finally {
        setAreaLoading(false);
      }
    }
    if (savedAreaId) {
      const parsedAreaId = isNaN(savedAreaId) ? savedAreaId : Number(savedAreaId);
      searchForm.setFieldsValue({ areaId: parsedAreaId });
    }
    setSearchModalVisible(true);
  };

  // ── Fetch completed when tab changes ────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'completed' && !completedFetched) fetchCompletedLoanData(appliedAreaId);
  }, [activeTab]);

  // ── Scroll handler ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const el = document.getElementById('scrollableDiv');
      if (el) {
        const cur = el.scrollTop;
        if (cur > lastScrollY && cur > 50 && accordionOpen) setAccordionOpen(false);
        setLastScrollY(cur);
      }
    };
    const el = document.getElementById('scrollableDiv');
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [lastScrollY, accordionOpen]);

  // ── Show all customers toggle ────────────────────────────────────────────────
  useEffect(() => {
    if (showAllCustomers) {
      if (!allActiveFetched) fetchAllActiveLoans(appliedAreaId);
      else {
        setDisplayedAllActive(allActiveLoans);
        setAllActivePagination({ displayed: Math.min(PAGE_SIZE, allActiveLoans.length), total: allActiveLoans.length });
      }
    }
  }, [showAllCustomers]);

  // ── Fetch line dropdown ──────────────────────────────────────────────────────
  const fetchLineDropdown = async () => {
    try {
      setLineLoading(true);
      const lineResponse = await GET('api/line_dd');
      if (lineResponse?.status === 200) {
        setLineDropdownList(lineResponse.data);
      } else {
        notification.error({ message: 'Failed to fetch lines' });
        setLineDropdownList([]);
      }
    } catch (error) {
      console.error('Error fetching line dropdown:', error);
      notification.error({ message: 'Failed to load line data' });
      setLineDropdownList([]);
    } finally {
      setLineLoading(false);
    }
  };

  // ── Handle line change → fetch areas ────────────────────────────────────────
  const handleLineChange = async (lineId) => {
    setSelectedLineId(lineId);
    searchForm.setFieldsValue({ areaId: undefined });
    setFilteredAreaList([]);

    if (!lineId) return;

    try {
      setAreaLoading(true);
      const response = await GET(`api/area_dd?line_id=${lineId}`);
      if (response?.status === 200) {
        setFilteredAreaList(response.data);
      } else {
        notification.error({ message: 'Failed to fetch areas' });
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
    } finally {
      setAreaLoading(false);
    }
  };

  // ── Fetch loan-to-be-completed (accepts optional areaId param) ───────────────
  const fetchLoanToBeCompleted = async (areaId = null) => {
    try {
      setLoading(true);
      const aId = areaId ?? appliedAreaId;
      const url = aId
        ? `api/loan-to-be-completed/?area_ids=${aId}`
        : 'api/loan-to-be-completed/';
      const response = await GET(url);
      if (response?.status === 200) {
        const raw = Array.isArray(response.data) ? response.data : response.data?.results ?? [];
        setLoanToBeCompleted(raw);
        setDisplayedLoanToBeCompleted(raw);
        setPagination({ displayed: Math.min(PAGE_SIZE, raw.length), total: raw.length });
        setLoanToBeCompletedFetched(true);
      } else {
        notification.error({ message: 'Failed to fetch loans' });
      }
    } catch {
      notification.error({ message: 'Error loading loans.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch all active loans (accepts optional areaId param) ───────────────────
  const fetchAllActiveLoans = async (areaId = null) => {
    try {
      setAllActiveLoading(true);
      const aId = areaId ?? appliedAreaId;
      const url = aId
        ? `api/overall-active-loans/?area_ids=${aId}`
        : 'api/overall-active-loans/';
      const response = await GET(url);
      if (response?.status === 200 && response.data) {
        const raw = Array.isArray(response.data) ? response.data : response.data?.results ?? [];
        setAllActiveLoans(raw);
        setDisplayedAllActive(raw);
        setAllActivePagination({ displayed: Math.min(PAGE_SIZE, raw.length), total: raw.length });
        setAllActiveFetched(true);
      } else {
        notification.error({ message: 'Failed to fetch active loans' });
      }
    } catch {
      notification.error({ message: 'Error loading active loans.' });
    } finally {
      setAllActiveLoading(false);
    }
  };

  // ── Fetch completed loans (accepts optional areaId param) ───────────────────
  const fetchCompletedLoanData = async (areaId = null) => {
    try {
      setCompletedLoading(true);
      const aId = areaId ?? appliedAreaId;
      const url = aId
        ? `api/loan-already-completed/?area_ids=${aId}`
        : 'api/loan-already-completed/';
      const response = await GET(url);
      if (response?.status === 200 && response.data) {
        const raw = Array.isArray(response.data) ? response.data : response.data?.results ?? [];
        setCompletedLoans(raw);
        setDisplayedCompleted(raw);
        setCompletedPagination({ displayed: Math.min(PAGE_SIZE, raw.length), total: raw.length });
      } else {
        notification.error({ message: 'Failed to fetch completed loans' });
      }
    } catch {
      notification.error({ message: 'Error loading completed loans.' });
    } finally {
      setCompletedLoading(false);
      setCompletedFetched(true);
    }
  };

  // ── Fetch ALL disburse loans and build map by loan id ────────────────────────
  const fetchAllDisburseLoans = async () => {
    if (disburseLoanFetched) return disburseLoanMap;
    try {
      setExpandLoading(true);
      let allDisbursed = [];
      let nextUrl = 'api/disburse_loan/';
      while (nextUrl) {
        const dr = await GET(nextUrl);
        if (dr?.status === 200) {
          const page = Array.isArray(dr.data) ? dr.data : dr.data?.results ?? [];
          allDisbursed = [...allDisbursed, ...page];
          nextUrl = dr.data?.next ? dr.data.next.replace(/^https?:\/\/[^/]+\//, '') : null;
        } else {
          nextUrl = null;
        }
      }
      const dMap = {};
      allDisbursed.forEach(loan => {
        const lid = String(loan.id);
        dMap[lid] = {
          ...loan,
          loan_dsbrsmnt_mode: mapLoanMode(loan.loan_dsbrsmnt_mode),
          loan_dsbrsmnt_comnt: loan.loan_dsbrsmnt_remark ?? loan.loan_dsbrsmnt_comnt ?? null,
          loan_dsbrsmnt_online_amnt: loan.loan_dsbrsmnt_amnt_online ?? loan.loan_dsbrsmnt_online_amnt ?? null,
          loan_dsbrsmnt_cash_amnt: loan.loan_dsbrsmnt_amnt_cash ?? loan.loan_dsbrsmnt_cash_amnt ?? null,
          loan_dsbrsmnt_online_cmt: loan.loan_dsbrsmnt_amnt_online_remark ?? loan.loan_dsbrsmnt_online_cmt ?? null,
          loan_dsbrsmnt_cash_cmt: loan.loan_dsbrsmnt_amnt_cash_remark ?? loan.loan_dsbrsmnt_cash_cmt ?? null,
        };
      });
      setDisburseLoanMap(dMap);
      setDisburseLoanFetched(true);
      return dMap;
    } catch {
      notification.error({ message: 'Error loading loan details.' });
      return disburseLoanMap;
    } finally {
      setExpandLoading(false);
    }
  };

  // ── Get detail loans for a customer using loan_disbursement_id list ──────────
  const getDetailLoansForCustomer = (customer, map) => {
    const loanIds = (customer.loans ?? []).map(l => String(l.loan_disbursement_id));
    return loanIds.map(id => map[id]).filter(Boolean);
  };

  // ── Pagination helpers ───────────────────────────────────────────────────────
  const loadMoreLoanToBeCompleted = () => setPagination(p => ({ ...p, displayed: Math.min(p.displayed + PAGE_SIZE, p.total) }));
  const loadMoreAllActive = () => setAllActivePagination(p => ({ ...p, displayed: Math.min(p.displayed + PAGE_SIZE, p.total) }));
  const loadMoreCompleted = () => setCompletedPagination(p => ({ ...p, displayed: Math.min(p.displayed + PAGE_SIZE, p.total) }));

  // ── Expand/collapse handler ──────────────────────────────────────────────────
  const handleExpandToggle = async (customer) => {
    const cid = String(customer.customer_id);
    if (String(expandedCustomerId) === cid) {
      setExpandedCustomerId(null);
      return;
    }
    setExpandedCustomerId(cid);
    setAccordionOpen(false);
    await fetchAllDisburseLoans();
    if (isMobile) {
      setTimeout(() => {
        const sc = document.getElementById('scrollableDiv');
        const el = document.querySelector(`[data-customer-id="${cid}"]`);
        if (sc && el) sc.scrollTo({ top: el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop, behavior: 'smooth' });
      }, 350);
    }
  };

  const handleCompletedExpandToggle = async (customer) => {
    const cid = String(customer.customer_id ?? customer.id);
    if (String(expandedCompletedCustomerId) === cid) {
      setExpandedCompletedCustomerId(null);
      return;
    }
    setExpandedCompletedCustomerId(cid);
    setAccordionOpen(false);
    await fetchAllDisburseLoans();
  };

  // ── Add loan handler ─────────────────────────────────────────────────────────
  const handleAddLoan = (customer) => {
    navigate('/new-loan-disbursement/add', {
      state: {
        mode: 'add',
        customerCode: customer.customer_id,
        customerName: customer.customer_name,
      },
    });
  };

  // ── Edit loan handler ────────────────────────────────────────────────────────
  const handleEditCustomer = async (customer) => {
    const customerName = customer.customer_name ?? 'N/A';
    const map = await fetchAllDisburseLoans();
    const loans = getDetailLoansForCustomer(customer, map);
    if (loans.length === 0) {
      notification.warning({ message: 'No Loans to Edit', description: `${customerName} has no active loans.` });
      return;
    }
    if (loans.length === 1) {
      const loan = loans[0];
      navigate(`/new-loan-disbursement/${loan.id}`, {
        state: { mode: 'edit', customerName, loanData: loan },
      });
      return;
    }
    setSelectedCustomerForEdit({ ...customer, resolvedLoans: loans });
    setLoanSelectionModalVisible(true);
    loanSelectionForm.resetFields();
  };

  const handleLoanSelectionOk = () => {
    loanSelectionForm.validateFields().then((values) => {
      const c = selectedCustomerForEdit;
      const selectedLoan = c.resolvedLoans?.find(l => String(l.id) === String(values.loanSelection));
      if (selectedLoan) {
        navigate(`/new-loan-disbursement/${selectedLoan.id}`, {
          state: { mode: 'edit', customerName: c.customer_name, loanData: selectedLoan },
        });
        setLoanSelectionModalVisible(false);
        loanSelectionForm.resetFields();
        setSelectedCustomerForEdit(null);
      }
    }).catch(console.log);
  };

  const handleLoanSelectionCancel = () => {
    setLoanSelectionModalVisible(false);
    loanSelectionForm.resetFields();
    setSelectedCustomerForEdit(null);
  };

  // ── Delete handler ───────────────────────────────────────────────────────────
  const onDelete = async (customer) => {
    try {
      const name = customer.customer_name ?? 'N/A';
      setLoanToBeCompleted(p => p.filter(c => c.customer_id !== customer.customer_id));
      setDisplayedLoanToBeCompleted(p => p.filter(c => c.customer_id !== customer.customer_id));
      if (expandedCustomerId === String(customer.customer_id)) setExpandedCustomerId(null);
      notification.success({ message: 'Loan Deleted', description: `Loan for ${name} removed.`, duration: 5 });
    } catch {
      notification.error({ message: 'Delete Failed', duration: 5 });
    }
  };

  // ── Search: apply ────────────────────────────────────────────────────────────
  const handleSearchApply = (values) => {
    const line = lineDropdownList.find(l => l.line_id === values.lineId);
    const area = filteredAreaList.find(a => a.id === values.areaId);
    const lineName = line?.line_name ?? String(values.lineId);
    const areaName = area?.areaName ?? String(values.areaId);
    const dateStr = values.date ? values.date.format('DD/MM/YYYY') : null;

    // Persist to localStorage
    localStorage.setItem('selected_line_id', String(values.lineId));
    localStorage.setItem('selected_line_name', lineName);
    localStorage.setItem('selected_area_id', String(values.areaId));
    localStorage.setItem('selected_area_name', areaName);
    if (dateStr) localStorage.setItem('selected_search_date', dateStr);
    else localStorage.removeItem('selected_search_date');

    setAppliedDate(dateStr);
    setAppliedLineName(lineName);
    setAppliedAreaName(areaName);
    setAppliedAreaId(values.areaId ?? null);   // ← NEW
    setShowSearchReset(true);

    notification.success({
      message: 'Search Applied',
      description: 'Showing results for selected criteria.',
    });
    setSearchModalVisible(false);

    // Re-fetch both lists with the newly selected area_id
    setLoanToBeCompletedFetched(false);
    setAllActiveFetched(false);
    fetchLoanToBeCompleted(values.areaId);
    if (showAllCustomers) fetchAllActiveLoans(values.areaId);
    if (completedFetched) fetchCompletedLoanData(values.areaId);
  };

  // ── Search: reset ────────────────────────────────────────────────────────────
  const handleSearchReset = () => {
    localStorage.removeItem('selected_line_id');
    localStorage.removeItem('selected_line_name');
    localStorage.removeItem('selected_area_id');
    localStorage.removeItem('selected_area_name');
    localStorage.removeItem('selected_search_date');

    setAppliedDate(null);
    setAppliedLineName(null);
    setAppliedAreaName(null);
    setAppliedAreaId(null);   // ← NEW
    setShowSearchReset(false);

    searchForm.resetFields();
    setSelectedLineId(null);
    setFilteredAreaList([]);

    setSearchModalVisible(true);
  };

  // ── Menus ────────────────────────────────────────────────────────────────────
  const renderCustomerMenu = (customer) => (
    <Menu>
      <Menu.Item key="view" onClick={() => handleExpandToggle(customer)}>
        <div className="d-flex align-items-center gap-1"><span className="mdi mdi-eye text-secondary" /><span>View Details</span></div>
      </Menu.Item>
      <Menu.Item key="edit" onClick={() => handleEditCustomer(customer)}>
        <div className="d-flex align-items-center gap-1"><span className="mdi mdi-pencil text-secondary" /><span>Edit</span></div>
      </Menu.Item>
      <Menu.Item key="delete">
        <Popconfirm
          title={`Delete loan for ${customer.customer_name}?`}
          description="Are you sure you want to delete this loan permanently?"
          icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          onConfirm={(e) => { e?.stopPropagation(); onDelete(customer); }}
          okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true, type: 'primary' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="d-flex align-items-center gap-1" style={{ color: 'red' }}>
            <DeleteFilled style={{ color: 'red' }} /><span>Delete</span>
          </div>
        </Popconfirm>
      </Menu.Item>
    </Menu>
  );

  const renderCompletedCustomerMenu = (customer) => (
    <Menu>
      <Menu.Item key="view" onClick={() => handleCompletedExpandToggle(customer)}>
        <div className="d-flex align-items-center gap-1"><span className="mdi mdi-eye text-secondary" /><span>View Details</span></div>
      </Menu.Item>
    </Menu>
  );

  // ── Render: loan-to-be-completed list item ───────────────────────────────────
  const renderLoanToBeCompletedItem = (customer, index) => {
    const cid = String(customer.customer_id);
    const isExpanded = String(expandedCustomerId) === cid;
    const loanCount = customer.total_active_loans ?? 0;
    const customerName = customer.customer_name ?? 'N/A';
    const firstAcc = customer.loans?.[0]?.loan_account_number ?? '';
    const accountSuffix = firstAcc ? getLastNonZeroDigits(firstAcc, 6) : '';
    const totalPendingEmi = (customer.loans ?? []).reduce((sum, l) => sum + (l.pending_installments ?? 0), 0);
    const detailLoans = getDetailLoansForCustomer(customer, disburseLoanMap);

    if (isMobile) {
      return (
        <div key={cid} className="loan-mobile-item-wrapper" style={{ marginBottom: '12px' }} data-customer-id={cid}>
          <div style={{ position: 'relative' }}>
            <SwipeablePanel
              item={{ ...customer, lineIndex: index + 1, displayTitle: `${accountSuffix ? accountSuffix + ' - ' : ''}${customerName}` }}
              titleKey="displayTitle"
              name="loan"
              onSwipeRight={!isExpanded ? () => handleEditCustomer(customer) : undefined}
              onSwipeLeft={!isExpanded ? () => onDelete(customer) : undefined}
              isSwipeOpen={openSwipeId === cid}
              onSwipeStateChange={(isOpen) => {
                if (isOpen) setOpenSwipeId(cid);
                else if (openSwipeId === cid) setOpenSwipeId(null);
              }}
              isExpanded={isExpanded}
              onExpandToggle={() => handleExpandToggle(customer)}
              disableAutoScroll={true}
              renderContent={() => (
                <div style={{ padding: '12px' }}>
                  {expandLoading && detailLoans.length === 0
                    ? <div style={{ textAlign: 'center', padding: '20px' }}><Spin tip="Loading..." /></div>
                    : <LoanCollapseContent customer={customer} loans={detailLoans} />
                  }
                </div>
              )}
            />
            {!isExpanded && openSwipeId !== cid && (
              <div style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loanCount < 2 && (
                  <Button
                    type="primary" shape="circle" icon={<PlusOutlined />} size="small"
                    onClick={(e) => { e.stopPropagation(); handleAddLoan(customer); }}
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)', backgroundColor: '#28a745', borderColor: '#28a745' }}
                  />
                )}
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '35px', height: '35px', border: '1px solid #d9d9d9', borderRadius: '17.5px', backgroundColor: '#fff', fontWeight: '600', fontSize: '20px', marginRight: '5px' }}>
                  {loanCount}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={cid} className="loan-customer-list-item-wrapper">
        <List.Item
          className={isExpanded ? 'loan-customer-list-item loan-list-item-expanded' : 'loan-customer-list-item'}
          style={{ cursor: 'pointer' }}
          onClick={() => handleExpandToggle(customer)}
        >
          <List.Item.Meta
            avatar={<div className="loan-customer-index-badge">{index + 1}</div>}
            title={
              <div className="loan-customer-title-container">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="loan-customer-name">
                      {accountSuffix ? `${accountSuffix} - ` : ''}{customerName}
                      {totalPendingEmi > 0 && (
                        <Tag color="orange" style={{ marginLeft: '8px', fontSize: '11px' }}>
                          {totalPendingEmi} EMI pending
                        </Tag>
                      )}
                    </span>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '38px', height: '38px', border: '1px solid #d9d9d9', borderRadius: '19px', backgroundColor: '#fff', fontWeight: '600', fontSize: '22px', marginRight: '20px' }}>
                      {loanCount}
                    </div>
                  </div>
                  {customer.loans?.length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      {customer.loans.map(l => (
                        <Tag key={l.loan_account_number} style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                          {getLastNonZeroDigits(l.loan_account_number, 8)}
                          {l.pending_installments != null && (
                            <span style={{ color: '#fa8c16', marginLeft: '4px' }}>·{l.pending_installments}</span>
                          )}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
                <div className="loan-customer-actions" onClick={(e) => e.stopPropagation()}>
                  {loanCount < 2 && (
                    <Button
                      type="primary" shape="circle" icon={<PlusOutlined />} size="small"
                      onClick={(e) => { e.stopPropagation(); handleAddLoan(customer); }}
                      style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
                    />
                  )}
                  <Dropdown overlay={renderCustomerMenu(customer)} trigger={['click']}>
                    <EllipsisOutlined className="loan-ellipsis-icon" onClick={(e) => e.stopPropagation()} />
                  </Dropdown>
                </div>
              </div>
            }
          />
        </List.Item>
        {isExpanded && (
          <div className="loan-collapse-content" style={{ padding: '16px', background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
            {expandLoading && detailLoans.length === 0
              ? <div style={{ textAlign: 'center', padding: '20px' }}><Spin tip="Loading loan details..." /></div>
              : <LoanCollapseContent customer={customer} loans={detailLoans} />
            }
          </div>
        )}
      </div>
    );
  };

  // ── Render: all active list item ─────────────────────────────────────────────
  const renderAllActiveItem = (customer, index) => {
    const cid = String(customer.customer_id ?? customer.id);
    const isExpanded = String(expandedCustomerId) === cid;
    const loanCount = customer.total_active_loans ?? customer.loans?.length ?? 0;
    const customerName = customer.customer_name ?? 'N/A';
    const firstAcc = customer.loans?.[0]?.loan_account_number ?? '';
    const accountSuffix = firstAcc ? getLastNonZeroDigits(firstAcc, 6) : '';
    const detailLoans = getDetailLoansForCustomer(customer, disburseLoanMap);

    if (isMobile) {
      return (
        <div key={cid} className="loan-mobile-item-wrapper" style={{ marginBottom: '12px' }} data-customer-id={cid}>
          <div style={{ position: 'relative' }}>
            <SwipeablePanel
              item={{ ...customer, lineIndex: index + 1, displayTitle: `${accountSuffix ? accountSuffix + ' - ' : ''}${customerName}` }}
              titleKey="displayTitle"
              name="loan-active"
              onSwipeRight={!isExpanded ? () => handleEditCustomer(customer) : undefined}
              onSwipeLeft={!isExpanded ? () => onDelete(customer) : undefined}
              isSwipeOpen={openSwipeId === cid}
              onSwipeStateChange={(isOpen) => {
                if (isOpen) setOpenSwipeId(cid);
                else if (openSwipeId === cid) setOpenSwipeId(null);
              }}
              isExpanded={isExpanded}
              onExpandToggle={() => handleExpandToggle(customer)}
              disableAutoScroll={true}
              renderContent={() => (
                <div style={{ padding: '12px' }}>
                  {expandLoading && detailLoans.length === 0
                    ? <div style={{ textAlign: 'center', padding: '20px' }}><Spin tip="Loading..." /></div>
                    : <LoanCollapseContent customer={customer} loans={detailLoans} />
                  }
                </div>
              )}
            />
            {!isExpanded && openSwipeId !== cid && (
              <div style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loanCount < 2 && (
                  <Button
                    type="primary" shape="circle" icon={<PlusOutlined />} size="small"
                    onClick={(e) => { e.stopPropagation(); handleAddLoan(customer); }}
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)', backgroundColor: '#28a745', borderColor: '#28a745' }}
                  />
                )}
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '35px', height: '35px', border: '1px solid #d9d9d9', borderRadius: '17.5px', backgroundColor: '#fff', fontWeight: '600', fontSize: '20px', marginRight: '5px' }}>
                  {loanCount}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={cid} className="loan-customer-list-item-wrapper">
        <List.Item
          className={isExpanded ? 'loan-customer-list-item loan-list-item-expanded' : 'loan-customer-list-item'}
          style={{ cursor: 'pointer' }}
          onClick={() => handleExpandToggle(customer)}
        >
          <List.Item.Meta
            avatar={<div className="loan-customer-index-badge">{index + 1}</div>}
            title={
              <div className="loan-customer-title-container">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="loan-customer-name">
                      {accountSuffix ? `${accountSuffix} - ` : ''}{customerName}
                    </span>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '38px', height: '38px', border: '1px solid #d9d9d9', borderRadius: '19px', backgroundColor: '#fff', fontWeight: '600', fontSize: '22px', marginRight: '20px' }}>
                      {loanCount}
                    </div>
                  </div>
                  {customer.loans?.length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      {customer.loans.map(l => (
                        <Tag key={l.loan_account_number} style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                          {getLastNonZeroDigits(l.loan_account_number, 8)}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
                <div className="loan-customer-actions" onClick={(e) => e.stopPropagation()}>
                  {loanCount < 2 && (
                    <Button
                      type="primary" shape="circle" icon={<PlusOutlined />} size="small"
                      onClick={(e) => { e.stopPropagation(); handleAddLoan(customer); }}
                      style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
                    />
                  )}
                </div>
              </div>
            }
          />
        </List.Item>
        {isExpanded && (
          <div className="loan-collapse-content" style={{ padding: '16px', background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
            {expandLoading && detailLoans.length === 0
              ? <div style={{ textAlign: 'center', padding: '20px' }}><Spin tip="Loading loan details..." /></div>
              : <LoanCollapseContent customer={customer} loans={detailLoans} />
            }
          </div>
        )}
      </div>
    );
  };

  // ── Render: completed item ───────────────────────────────────────────────────
  const renderCompletedItem = (customer, index) => {
    const cid = String(customer.customer_id ?? customer.id);
    const isExpanded = String(expandedCompletedCustomerId) === cid;
    const loanCount = customer.total_active_loans ?? customer.loans?.length ?? 0;
    const customerName = customer.customer_name ?? 'N/A';
    const firstAcc = customer.loans?.[0]?.loan_account_number ?? '';
    const accountSuffix = firstAcc ? String(firstAcc).slice(-6).replace(/^0+/, '') || String(firstAcc).slice(-1) : '';
    const detailLoans = getDetailLoansForCustomer(customer, disburseLoanMap);

    if (isMobile) {
      return (
        <div key={cid} className="loan-mobile-item-wrapper" style={{ marginBottom: '12px' }}>
          <div style={{ position: 'relative' }}>
            <SwipeablePanel
              item={{ ...customer, lineIndex: index + 1, displayTitle: `${accountSuffix ? accountSuffix + ' - ' : ''}${customerName}` }}
              index={customer.customer_id ?? customer.id}
              titleKey="displayTitle"
              subtitleKey="customer_id"
              name="completed-loan"
              isSwipeOpen={openCompletedSwipeId === cid}
              onSwipeStateChange={(isOpen) => {
                if (isOpen) setOpenCompletedSwipeId(cid);
                else if (openCompletedSwipeId === cid) setOpenCompletedSwipeId(null);
              }}
              isExpanded={isExpanded}
              onExpandToggle={() => handleCompletedExpandToggle(customer)}
              disableAutoScroll={true}
              renderContent={() => (
                <div style={{ padding: '12px' }}>
                  {expandLoading && detailLoans.length === 0
                    ? <div style={{ textAlign: 'center', padding: '20px' }}><Spin tip="Loading..." /></div>
                    : <LoanCollapseContent customer={customer} loans={detailLoans} />
                  }
                </div>
              )}
            />
            {!isExpanded && openCompletedSwipeId !== cid && (
              <div style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '35px', height: '35px', border: '1px solid #d9d9d9', borderRadius: '17.5px', backgroundColor: '#fff', fontWeight: '600', fontSize: '20px', marginRight: '5px' }}>
                  {loanCount}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={cid} className="loan-customer-list-item-wrapper">
        <List.Item
          className={isExpanded ? 'loan-customer-list-item loan-list-item-expanded' : 'loan-customer-list-item'}
          style={{ cursor: 'pointer' }}
          onClick={() => handleCompletedExpandToggle(customer)}
        >
          <List.Item.Meta
            avatar={<div className="loan-customer-index-badge">{index + 1}</div>}
            title={
              <div className="loan-customer-title-container">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="loan-customer-name">{accountSuffix ? `${accountSuffix} - ` : ''}{customerName}</span>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '38px', height: '38px', border: '1px solid #d9d9d9', borderRadius: '19px', backgroundColor: '#fff', fontWeight: '600', fontSize: '22px', marginRight: '20px' }}>
                      {loanCount}
                    </div>
                  </div>
                </div>
                <div className="loan-customer-actions" onClick={(e) => e.stopPropagation()}>
                  <Dropdown overlay={renderCompletedCustomerMenu(customer)} trigger={['click']}>
                    <EllipsisOutlined className="loan-ellipsis-icon" onClick={(e) => e.stopPropagation()} />
                  </Dropdown>
                </div>
              </div>
            }
          />
        </List.Item>
        {isExpanded && (
          <div className="loan-collapse-content" style={{ padding: '16px', background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
            {expandLoading && detailLoans.length === 0
              ? <div style={{ textAlign: 'center', padding: '20px' }}><Spin tip="Loading loan details..." /></div>
              : <LoanCollapseContent customer={customer} loans={detailLoans} />
            }
          </div>
        )}
      </div>
    );
  };

  // ── Empty state ──────────────────────────────────────────────────────────────
  const EmptyState = ({ type = 'disburse' }) => {
    const isCompleted = type === 'completed';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: isCompleted ? '#f6ffed' : '#f0f5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <span className={isCompleted ? 'mdi mdi-check-circle-outline' : 'mdi mdi-bank-outline'} style={{ fontSize: '38px', color: isCompleted ? '#52c41a' : '#4096ff' }} />
        </div>
        <Text style={{ fontSize: '17px', fontWeight: '600', color: '#262626', marginBottom: '8px', display: 'block' }}>
          {isCompleted ? 'No Completed Loans' : 'No Loans Found'}
        </Text>
        <Text type="secondary" style={{ fontSize: '14px', maxWidth: '280px', lineHeight: '1.6', display: 'block', marginBottom: '24px' }}>
          {isCompleted ? 'Loans that have been fully repaid will appear here.' : 'No pending loan disbursements found.'}
        </Text>
        <Button onClick={isCompleted ? fetchCompletedLoanData : fetchLoanToBeCompleted} size="middle" style={{ borderRadius: '6px' }}>
          Refresh
        </Button>
      </div>
    );
  };

  const hasMoreLoanToBeCompleted = pagination.displayed < pagination.total;
  const hasMoreAllActive = allActivePagination.displayed < allActivePagination.total;
  const hasMoreCompleted = completedPagination.displayed < completedPagination.total;

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="loan-page-content">
      {(loading || allActiveLoading) && <Loader />}

      {/* Header */}
      <div className="loan-disbursement-header-container loan-disbursement-header">
        <h2 className="loan-disbursement-title">Loan</h2>
        <div className="loan-disbursement-actions">
          <Button
            icon={<SwapOutlined rotate={90} />}
            onClick={() => notification.info({ message: 'Reorder coming soon!' })}
            type="default"
            className="loan-action-btn"
          >
            {!isMobile && 'Reorder'}
          </Button>
          <Button
            icon={<SearchOutlined />}
            onClick={async () => {
              const savedLineId = localStorage.getItem('selected_line_id');
              const savedAreaId = localStorage.getItem('selected_area_id');
              if (savedLineId) {
                const parsedLineId = isNaN(savedLineId) ? savedLineId : Number(savedLineId);
                setSelectedLineId(parsedLineId);
                searchForm.setFieldsValue({ lineId: parsedLineId });
                try {
                  setAreaLoading(true);
                  const response = await GET(`api/area_dd?line_id=${parsedLineId}`);
                  if (response?.status === 200) setFilteredAreaList(response.data);
                } catch (error) {
                  console.error('Error fetching areas on modal open:', error);
                } finally {
                  setAreaLoading(false);
                }
              }
              if (savedAreaId) {
                const parsedAreaId = isNaN(savedAreaId) ? savedAreaId : Number(savedAreaId);
                searchForm.setFieldsValue({ areaId: parsedAreaId });
              }
              setSearchModalVisible(true);
            }}
            type="default"
            className="loan-action-btn"
          >
            {!isMobile && 'Search'}
          </Button>
          <Button
            icon={<FilterOutlined />}
            onClick={() => setFilterModalVisible(true)}
            type="default"
            className="loan-action-btn"
          >
            {!isMobile && 'Filter'}
          </Button>
          <Dropdown
            overlay={<Menu><Menu.Item key="export">Export Data</Menu.Item></Menu>}
            trigger={['click']}
          >
            <Button icon={<EllipsisOutlined rotate={90} />} type="default" className="loan-action-btn" />
          </Dropdown>
        </div>
      </div>

      {/* ── Summary accordion ────────────────────────────────────────────────── */}
      <Card
        className="loan-accordion-card mb-3"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'sticky', top: '72px', zIndex: 99, backgroundColor: '#fff' }}
      >
        <Collapse
          activeKey={accordionOpen ? ['summary'] : []}
          onChange={() => setAccordionOpen(!accordionOpen)}
          expandIconPosition="end"
          style={{ border: 'none', background: 'transparent' }}
        >
          <Collapse.Panel
            header={
              <div style={{ width: '100%' }}>
                {/* ── Row 1: LineName : AreaName (no labels) ── */}
                <Row justify="space-between" align="middle" style={{ width: '100%', marginBottom: '2px' }}>
                  <Col>
                    <Text style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {appliedLineName && appliedAreaName
                        ? `${appliedLineName} : ${appliedAreaName}`
                        : appliedLineName || appliedAreaName || '— : —'}
                    </Text>
                  </Col>
                </Row>
                {/* ── Row 2: Date and Balance ── */}
                <Row justify="space-between" align="middle" style={{ width: '100%' }}>
                  <Col>
                    <Text style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      Date: {appliedDate || '—'}
                    </Text>
                  </Col>
                  <Col>
                    <Text style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      Bal: 284303
                    </Text>
                  </Col>
                </Row>
              </div>
            }
            key="summary"
            style={{ border: 'none' }}
          >
            <div style={{ marginTop: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px', marginBottom: '12px', border: '1px solid #e8e8e8', borderRadius: '8px', overflow: 'hidden' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px 16px', width: '33.33%', borderRight: '1px solid #e8e8e8', background: '#fafafa' }}><span style={{ fontWeight: '500', color: '#8c8c8c', fontSize: '14px' }}>O.Bal: </span><span style={{ fontWeight: '600', fontSize: '16px', color: '#000' }}>284303</span></td>
                    <td style={{ padding: '12px 16px', width: '33.33%', borderRight: '1px solid #e8e8e8', background: '#fafafa' }}><span style={{ fontWeight: '500', color: '#8c8c8c', fontSize: '14px' }}>T: </span><span style={{ fontWeight: '600', fontSize: '16px', color: '#000' }}>10</span></td>
                    <td style={{ padding: '12px 16px', width: '33.33%', background: '#fafafa' }}><span style={{ fontWeight: '500', color: '#8c8c8c', fontSize: '14px' }}>Bill: </span><span style={{ fontWeight: '600', fontSize: '16px', color: '#000' }}>0</span></td>
                  </tr>
                </tbody>
              </table>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px', border: '1px solid #e8e8e8', borderRadius: '8px', overflow: 'hidden' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px 16px', width: '33.33%', borderRight: '1px solid #e8e8e8', background: '#fafafa' }}><span style={{ fontWeight: '500', color: '#8c8c8c', fontSize: '14px' }}>Expense: </span><span style={{ fontWeight: '600', fontSize: '16px', color: '#000' }}>0</span></td>
                    <td style={{ padding: '12px 16px', width: '33.33%', borderRight: '1px solid #e8e8e8', background: '#fafafa' }}><span style={{ fontWeight: '500', color: '#8c8c8c', fontSize: '14px' }}>Coll: </span><span style={{ fontWeight: '600', fontSize: '16px', color: '#000' }}>0</span></td>
                    <td style={{ padding: '12px 16px', width: '33.33%', background: '#fafafa' }}><span style={{ fontWeight: '500', color: '#8c8c8c', fontSize: '14px' }}>Loan: </span><span style={{ fontWeight: '600', fontSize: '16px', color: '#000' }}>0</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Collapse.Panel>
        </Collapse>
      </Card>

      {/* Tabs */}
      <Card
        className="loan-tabs-card"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'sticky', top: accordionOpen ? '220px' : '130px', zIndex: 98, backgroundColor: '#fff', transition: 'top 0.3s ease' }}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ paddingLeft: '8px' }}>

          {/* ── DISBURSE tab ───────────────────────────────────────────────── */}
          <Tabs.TabPane tab={<span>DISBURSE</span>} key="pay">
            <div style={{ marginBottom: '16px' }}>
              <Checkbox checked={showAllCustomers} onChange={(e) => setShowAllCustomers(e.target.checked)}>
                Show All Customers
              </Checkbox>
            </div>
            <div id="scrollableDiv" className="loan-scrollable-div">
              {showAllCustomers ? (
                <>
                  {allActiveLoading ? (
                    <><Skeleton avatar paragraph={{ rows: 2 }} active /><Skeleton avatar paragraph={{ rows: 2 }} active /></>
                  ) : (
                    <InfiniteScroll
                      dataLength={allActivePagination.displayed}
                      next={loadMoreAllActive}
                      hasMore={hasMoreAllActive}
                      loader={<Skeleton avatar paragraph={{ rows: 2 }} active />}
                      endMessage={displayedAllActive.length > 0 && <Divider plain className="loan-divider-container">★ End of List ★</Divider>}
                      scrollableTarget="scrollableDiv"
                    >
                      <List dataSource={displayedAllActive.slice(0, allActivePagination.displayed)} renderItem={renderAllActiveItem} />
                    </InfiniteScroll>
                  )}
                  {!allActiveLoading && allActiveFetched && displayedAllActive.length === 0 && <EmptyState type="disburse" />}
                </>
              ) : (
                <>
                  {loading ? (
                    <><Skeleton avatar paragraph={{ rows: 2 }} active /><Skeleton avatar paragraph={{ rows: 2 }} active /></>
                  ) : (
                    <InfiniteScroll
                      dataLength={pagination.displayed}
                      next={loadMoreLoanToBeCompleted}
                      hasMore={hasMoreLoanToBeCompleted}
                      loader={<div className="loan-skeleton-container"><Skeleton avatar paragraph={{ rows: 2 }} active /></div>}
                      endMessage={displayedLoanToBeCompleted.length > 0 && <Divider plain className="loan-divider-container">★ End of List ★</Divider>}
                      scrollableTarget="scrollableDiv"
                    >
                      <List dataSource={displayedLoanToBeCompleted.slice(0, pagination.displayed)} renderItem={renderLoanToBeCompletedItem} />
                    </InfiniteScroll>
                  )}
                  {!loading && loanToBeCompletedFetched && displayedLoanToBeCompleted.length === 0 && <EmptyState type="disburse" />}
                </>
              )}
            </div>
          </Tabs.TabPane>

          {/* ── COLLECT tab ────────────────────────────────────────────────── */}
          <Tabs.TabPane tab={<span>COLLECT</span>} key="collect">
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <Text type="secondary" style={{ fontSize: '16px', fontStyle: 'italic' }}>Collection feature coming soon...</Text>
            </div>
          </Tabs.TabPane>

          {/* ── COMPLETED tab ──────────────────────────────────────────────── */}
          <Tabs.TabPane tab={<span>COMPLETED</span>} key="completed">
            <div id="completedScrollableDiv" className="loan-scrollable-div">
              {completedLoading ? (
                <><Skeleton avatar paragraph={{ rows: 2 }} active /><Skeleton avatar paragraph={{ rows: 2 }} active /></>
              ) : (
                <InfiniteScroll
                  dataLength={completedPagination.displayed}
                  next={loadMoreCompleted}
                  hasMore={hasMoreCompleted}
                  loader={<Skeleton avatar paragraph={{ rows: 2 }} active />}
                  endMessage={displayedCompleted.length > 0 && <Divider plain>★ End of List ★</Divider>}
                  scrollableTarget="completedScrollableDiv"
                >
                  <List dataSource={displayedCompleted.slice(0, completedPagination.displayed)} renderItem={renderCompletedItem} />
                </InfiniteScroll>
              )}
              {!completedLoading && completedFetched && displayedCompleted.length === 0 && <EmptyState type="completed" />}
            </div>
          </Tabs.TabPane>

        </Tabs>
      </Card>

      {/* ── Search Modal ──────────────────────────────────────────────────────── */}
      <Modal
        title={null}
        open={searchModalVisible}
        onCancel={() => {
          if (showSearchReset) {
            setSearchModalVisible(false);
          } else {
            notification.warning({
              message: 'Selection Required',
              description: 'Please select Line, Area and Date to view loans.',
            });
          }
        }}
        closable={showSearchReset}
        onOk={() => {
          searchForm.validateFields()
            .then((values) => handleSearchApply(values))
            .catch((info) => console.log('Validation Failed:', info));
        }}
        width={600}
        centered
        okText="Search"
        cancelText="Cancel"
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Search Loans</h3>
        </div>

        <Form form={searchForm} layout="vertical">

          {/* ── 1. Line ── */}
          <Form.Item
            name="lineId"
            label="Line"
            rules={[{ required: true, message: 'Please select a line' }]}
          >
            <SelectWithAddon
              icon={<ApartmentOutlined />}
              placeholder="Select Line"
              showSearch
              size="large"
              loading={lineLoading}
              onChange={handleLineChange}
              notFoundContent={lineLoading ? <Spin size="small" /> : 'No lines found'}
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

          {/* ── 2. Area ── */}
          <Form.Item
            name="areaId"
            label="Area"
            rules={[{ required: true, message: 'Please select an area' }]}
          >
            <SelectWithAddon
              icon={<EnvironmentOutlined />}
              placeholder={selectedLineId ? 'Select Area' : 'Select Line first'}
              showSearch
              size="large"
              loading={areaLoading}
              disabled={!selectedLineId}
              allowClear
              notFoundContent={areaLoading ? <Spin size="small" /> : 'No areas found'}
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {filteredAreaList.map((area) => (
                <Select.Option key={area.id} value={area.id}>
                  {area.areaName}
                </Select.Option>
              ))}
            </SelectWithAddon>
          </Form.Item>

          {/* ── 3. Date ── */}
          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select a date' }]}
            style={{ marginBottom: '32px' }}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Select Date"
              format="YYYY-MM-DD"
              size="large"
              suffixIcon={<CalendarOutlined />}
            />
          </Form.Item>

        </Form>
      </Modal>

      {/* ── Filter Modal ──────────────────────────────────────────────────────── */}
      <Modal
        title="Filter Options"
        open={filterModalVisible}
        onCancel={() => setFilterModalVisible(false)}
        footer={null}
      >
        <p>Filter by loan status, amount, date, etc.</p>
      </Modal>

      {/* ── Loan Selection Modal (multi-loan edit) ────────────────────────────── */}
      <Modal
        title={null}
        open={loanSelectionModalVisible}
        onOk={handleLoanSelectionOk}
        onCancel={handleLoanSelectionCancel}
        width={500}
        centered
        okText="Edit Selected Loan"
        cancelText="Cancel"
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Select Loan to Edit</h3>
          <Text type="secondary">{selectedCustomerForEdit?.customer_name}</Text>
        </div>
        <Form form={loanSelectionForm} layout="vertical">
          <Form.Item
            name="loanSelection"
            label="Select Loan"
            rules={[{ required: true, message: 'Please select a loan' }]}
          >
            <Select size="large" placeholder="Choose a loan to edit" allowClear>
              {selectedCustomerForEdit?.resolvedLoans?.map((loan) => (
                <Select.Option key={loan.id} value={loan.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{getMaskedAccountNumber(loan.loan_account_number)}</span>
                    <Space size="small">
                      <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {loan.loan_dsbrsmnt_dt
                          ? new Date(loan.loan_dsbrsmnt_dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : ''}
                      </span>
                      <span style={{ fontWeight: 600, color: '#1890ff' }}>
                        ₹{parseFloat(loan.loan_dsbrsmnt_amnt || 0).toLocaleString()}
                      </span>
                    </Space>
                  </div>
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