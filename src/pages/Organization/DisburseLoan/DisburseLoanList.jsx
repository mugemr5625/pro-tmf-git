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
  const [lastScrollY, setLastScrollY] = useState(0);

  // Pagination state for infinite scroll
  const [pagination, setPagination] = useState({ displayed: 10, total: 0 });
  const PAGE_SIZE = 10;

  // ─── Completed tab state ───────────────────────────────────────────────────
  const [completedLoans, setCompletedLoans] = useState([]);
  const [displayedCompletedLoans, setDisplayedCompletedLoans] = useState([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedPagination, setCompletedPagination] = useState({ displayed: 10, total: 0 });
  const [expandedCompletedCustomers, setExpandedCompletedCustomers] = useState({});
  const [openCompletedSwipeId, setOpenCompletedSwipeId] = useState(null);

  const hasMoreData = pagination.displayed < pagination.total;
  const hasMoreCompletedData = completedPagination.displayed < completedPagination.total;

  // ─── Active dummy data (status: Active) ───────────────────────────────────
  const dummyApiData = [
    {
      "id": 1, "LOAN_DSBRSMNT_BRNCH_NM": "Sholinganallur new", "LOAN_DSBRSMNT_LINE_NM": "Sholsssss",
      "LOAN_DSBRSMNT_AREA_NM": "Karappakkam -II", "LOAN_DSBRSMNT_CUST_NM": "Rajesh Kumar",
      "LOAN_DSBRSMNT_CUST_CD": 1, "LOAN_DSBRSMNT_CUST_ORDR": 1,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "finance", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": "Muge",
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "finance", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": "Muge",
      "loan_account_number": "18000202000015", "loan_account_code": 15,
      "loan_dsbrsmnt_repmnt_type": "Daily", "loan_dsbrsmnt_amnt": "50000.00",
      "loan_dsbrsmnt_intrst_amnt": "5000.00", "loan_dsbrsmnt_tot_instlmnt": 100,
      "loan_dsbrsmnt_prcsng_fee_amnt": "500.00", "loan_dsbrsmnt_instlmnt_amnt": "555.00",
      "loan_dsbrsmnt_dflt_pay_amnt": "555.00", "loan_dsbrsmnt_bad_loan_days": 30,
      "loan_dsbrsmnt_mode": "Online", "loan_dsbrsmnt_comnt": "First loan - online transfer",
      "loan_dsbrsmnt_dt": "2026-01-15", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-01-15T10:00:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-01-15T10:00:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 33, "loan_dsbrsmnt_line_id": 38, "loan_dsbrsmnt_area_id": 24,
      "loan_dsbrsmnt_cust_id": 100, "loan_dsbrsmnt_created_by": 8, "loan_dsbrsmnt_updtd_by": 8
    },
    {
      "id": 2, "LOAN_DSBRSMNT_BRNCH_NM": "Tiruvannamalaisssss", "LOAN_DSBRSMNT_LINE_NM": "Sengammmm",
      "LOAN_DSBRSMNT_AREA_NM": "Senji Road", "LOAN_DSBRSMNT_CUST_NM": "Priya Sharma",
      "LOAN_DSBRSMNT_CUST_CD": 2, "LOAN_DSBRSMNT_CUST_ORDR": 2,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "finance", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": "Muge",
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "finance", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": "Muge",
      "loan_account_number": "18010101000016", "loan_account_code": 16,
      "loan_dsbrsmnt_repmnt_type": "Weekly", "loan_dsbrsmnt_amnt": "30000.00",
      "loan_dsbrsmnt_intrst_amnt": "3000.00", "loan_dsbrsmnt_tot_instlmnt": 52,
      "loan_dsbrsmnt_prcsng_fee_amnt": "300.00", "loan_dsbrsmnt_instlmnt_amnt": "640.38",
      "loan_dsbrsmnt_dflt_pay_amnt": "640.38", "loan_dsbrsmnt_bad_loan_days": 45,
      "loan_dsbrsmnt_mode": "Cash", "loan_dsbrsmnt_comnt": "Cash disbursement for weekly repayment",
      "loan_dsbrsmnt_dt": "2026-01-20", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-01-20T11:30:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-01-20T11:30:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 34, "loan_dsbrsmnt_line_id": 35, "loan_dsbrsmnt_area_id": 18,
      "loan_dsbrsmnt_cust_id": 101, "loan_dsbrsmnt_created_by": 8, "loan_dsbrsmnt_updtd_by": 8
    },
    {
      "id": 3, "LOAN_DSBRSMNT_BRNCH_NM": "Sholinganallur new", "LOAN_DSBRSMNT_LINE_NM": "Sholsssss",
      "LOAN_DSBRSMNT_AREA_NM": "Karappakkam -II", "LOAN_DSBRSMNT_CUST_NM": "Amit Patel",
      "LOAN_DSBRSMNT_CUST_CD": 3, "LOAN_DSBRSMNT_CUST_ORDR": 3,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "finance", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": "Muge",
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "finance", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": "Muge",
      "loan_account_number": "18000202000017", "loan_account_code": 17,
      "loan_dsbrsmnt_repmnt_type": "Monthly", "loan_dsbrsmnt_amnt": "100000.00",
      "loan_dsbrsmnt_intrst_amnt": "10000.00", "loan_dsbrsmnt_tot_instlmnt": 12,
      "loan_dsbrsmnt_prcsng_fee_amnt": "1000.00", "loan_dsbrsmnt_instlmnt_amnt": "9250.00",
      "loan_dsbrsmnt_dflt_pay_amnt": "9250.00", "loan_dsbrsmnt_bad_loan_days": 60,
      "loan_dsbrsmnt_mode": "Both", "loan_dsbrsmnt_online_amnt": "60000.00", "loan_dsbrsmnt_cash_amnt": "40000.00",
      "loan_dsbrsmnt_comnt": "Mixed payment - part online, part cash",
      "loan_dsbrsmnt_online_cmt": "Online transfer of 60k via NEFT", "loan_dsbrsmnt_cash_cmt": "Cash payment of 40k received in office",
      "loan_dsbrsmnt_dt": "2026-01-25", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-01-25T09:00:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-01-25T09:00:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 33, "loan_dsbrsmnt_line_id": 38, "loan_dsbrsmnt_area_id": 24,
      "loan_dsbrsmnt_cust_id": 102, "loan_dsbrsmnt_created_by": 9, "loan_dsbrsmnt_updtd_by": 9
    },
    {
      "id": 4, "LOAN_DSBRSMNT_BRNCH_NM": "Sholinganallur new", "LOAN_DSBRSMNT_LINE_NM": "Sholsssss",
      "LOAN_DSBRSMNT_AREA_NM": "Karappakkam -II", "LOAN_DSBRSMNT_CUST_NM": "Amit Patel",
      "LOAN_DSBRSMNT_CUST_CD": 3, "LOAN_DSBRSMNT_CUST_ORDR": 3,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "fin", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": null,
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "fin", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": null,
      "loan_account_number": "18000202000018", "loan_account_code": 18,
      "loan_dsbrsmnt_repmnt_type": "Daily", "loan_dsbrsmnt_amnt": "25000.00",
      "loan_dsbrsmnt_intrst_amnt": "2500.00", "loan_dsbrsmnt_tot_instlmnt": 100,
      "loan_dsbrsmnt_prcsng_fee_amnt": "250.00", "loan_dsbrsmnt_instlmnt_amnt": "277.50",
      "loan_dsbrsmnt_dflt_pay_amnt": "277.50", "loan_dsbrsmnt_bad_loan_days": 30,
      "loan_dsbrsmnt_mode": "Online", "loan_dsbrsmnt_comnt": "Second loan for business expansion",
      "loan_dsbrsmnt_dt": "2026-02-01", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-02-01T10:30:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-02-01T10:30:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 33, "loan_dsbrsmnt_line_id": 38, "loan_dsbrsmnt_area_id": 24,
      "loan_dsbrsmnt_cust_id": 102, "loan_dsbrsmnt_created_by": 9, "loan_dsbrsmnt_updtd_by": 9
    },
    {
      "id": 5, "LOAN_DSBRSMNT_BRNCH_NM": "Tiruvannamalaisssss", "LOAN_DSBRSMNT_LINE_NM": "Sengammmm",
      "LOAN_DSBRSMNT_AREA_NM": "Senji Road", "LOAN_DSBRSMNT_CUST_NM": "Lakshmi Devi",
      "LOAN_DSBRSMNT_CUST_CD": 4, "LOAN_DSBRSMNT_CUST_ORDR": 4,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "finance", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": "Muge",
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "finance", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": "Muge",
      "loan_account_number": "18010101000019", "loan_account_code": 19,
      "loan_dsbrsmnt_repmnt_type": "Weekly", "loan_dsbrsmnt_amnt": "20000.00",
      "loan_dsbrsmnt_intrst_amnt": "2000.00", "loan_dsbrsmnt_tot_instlmnt": 52,
      "loan_dsbrsmnt_prcsng_fee_amnt": "200.00", "loan_dsbrsmnt_instlmnt_amnt": "427.69",
      "loan_dsbrsmnt_dflt_pay_amnt": "427.69", "loan_dsbrsmnt_bad_loan_days": 40,
      "loan_dsbrsmnt_mode": "Cash", "loan_dsbrsmnt_comnt": "Cash disbursement for small business",
      "loan_dsbrsmnt_dt": "2026-01-10", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-01-10T14:00:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-01-10T14:00:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 34, "loan_dsbrsmnt_line_id": 35, "loan_dsbrsmnt_area_id": 18,
      "loan_dsbrsmnt_cust_id": 103, "loan_dsbrsmnt_created_by": 8, "loan_dsbrsmnt_updtd_by": 8
    },
    {
      "id": 6, "LOAN_DSBRSMNT_BRNCH_NM": "Tiruvannamalaisssss", "LOAN_DSBRSMNT_LINE_NM": "Sengammmm",
      "LOAN_DSBRSMNT_AREA_NM": "Senji Road", "LOAN_DSBRSMNT_CUST_NM": "Vijay Anand",
      "LOAN_DSBRSMNT_CUST_CD": 5, "LOAN_DSBRSMNT_CUST_ORDR": 5,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "fin", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": null,
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "fin", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": null,
      "loan_account_number": "18010101000020", "loan_account_code": 20,
      "loan_dsbrsmnt_repmnt_type": "Monthly", "loan_dsbrsmnt_amnt": "75000.00",
      "loan_dsbrsmnt_intrst_amnt": "7500.00", "loan_dsbrsmnt_tot_instlmnt": 10,
      "loan_dsbrsmnt_prcsng_fee_amnt": "750.00", "loan_dsbrsmnt_instlmnt_amnt": "8325.00",
      "loan_dsbrsmnt_dflt_pay_amnt": "8325.00", "loan_dsbrsmnt_bad_loan_days": 90,
      "loan_dsbrsmnt_mode": "Both", "loan_dsbrsmnt_online_amnt": "50000.00", "loan_dsbrsmnt_cash_amnt": "25000.00",
      "loan_dsbrsmnt_comnt": "Partial online and cash disbursement",
      "loan_dsbrsmnt_online_cmt": "50k transferred via IMPS to savings account", "loan_dsbrsmnt_cash_cmt": "25k cash handed over at branch office",
      "loan_dsbrsmnt_dt": "2026-01-28", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-01-28T13:15:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-01-28T13:15:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 34, "loan_dsbrsmnt_line_id": 35, "loan_dsbrsmnt_area_id": 18,
      "loan_dsbrsmnt_cust_id": 104, "loan_dsbrsmnt_created_by": 9, "loan_dsbrsmnt_updtd_by": 9
    },
    {
      "id": 7, "LOAN_DSBRSMNT_BRNCH_NM": "Tiruvannamalaisssss", "LOAN_DSBRSMNT_LINE_NM": "Sengammmm",
      "LOAN_DSBRSMNT_AREA_NM": "Senji Road", "LOAN_DSBRSMNT_CUST_NM": "Vijay Anand",
      "LOAN_DSBRSMNT_CUST_CD": 5, "LOAN_DSBRSMNT_CUST_ORDR": 5,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "fin", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": null,
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "fin", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": null,
      "loan_account_number": "18010101000021", "loan_account_code": 21,
      "loan_dsbrsmnt_repmnt_type": "Daily", "loan_dsbrsmnt_amnt": "15000.00",
      "loan_dsbrsmnt_intrst_amnt": "1500.00", "loan_dsbrsmnt_tot_instlmnt": 100,
      "loan_dsbrsmnt_prcsng_fee_amnt": "150.00", "loan_dsbrsmnt_instlmnt_amnt": "166.50",
      "loan_dsbrsmnt_dflt_pay_amnt": "166.50", "loan_dsbrsmnt_bad_loan_days": 30,
      "loan_dsbrsmnt_mode": "Cash", "loan_dsbrsmnt_comnt": "Second loan - emergency cash",
      "loan_dsbrsmnt_dt": "2026-02-03", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-02-03T08:45:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-02-03T08:45:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 34, "loan_dsbrsmnt_line_id": 35, "loan_dsbrsmnt_area_id": 18,
      "loan_dsbrsmnt_cust_id": 104, "loan_dsbrsmnt_created_by": 9, "loan_dsbrsmnt_updtd_by": 9
    },
    {
      "id": 8, "LOAN_DSBRSMNT_BRNCH_NM": "Sholinganallur new", "LOAN_DSBRSMNT_LINE_NM": "Sholsssss",
      "LOAN_DSBRSMNT_AREA_NM": "Karappakkam -II", "LOAN_DSBRSMNT_CUST_NM": "Meena Kumari",
      "LOAN_DSBRSMNT_CUST_CD": 6, "LOAN_DSBRSMNT_CUST_ORDR": 6,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "finance", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": "Muge",
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "finance", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": "Muge",
      "loan_account_number": "18000202000022", "loan_account_code": 22,
      "loan_dsbrsmnt_repmnt_type": "Weekly", "loan_dsbrsmnt_amnt": "40000.00",
      "loan_dsbrsmnt_intrst_amnt": "4000.00", "loan_dsbrsmnt_tot_instlmnt": 52,
      "loan_dsbrsmnt_prcsng_fee_amnt": "400.00", "loan_dsbrsmnt_instlmnt_amnt": "853.85",
      "loan_dsbrsmnt_dflt_pay_amnt": "853.85", "loan_dsbrsmnt_bad_loan_days": 45,
      "loan_dsbrsmnt_mode": "Online", "loan_dsbrsmnt_comnt": "Online disbursement via bank transfer",
      "loan_dsbrsmnt_dt": "2026-01-18", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-01-18T12:00:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-01-18T12:00:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 33, "loan_dsbrsmnt_line_id": 38, "loan_dsbrsmnt_area_id": 24,
      "loan_dsbrsmnt_cust_id": 105, "loan_dsbrsmnt_created_by": 8, "loan_dsbrsmnt_updtd_by": 8
    },
    {
      "id": 9, "LOAN_DSBRSMNT_BRNCH_NM": "Tiruvannamalaisssss", "LOAN_DSBRSMNT_LINE_NM": "Sengammmm",
      "LOAN_DSBRSMNT_AREA_NM": "Senji Road", "LOAN_DSBRSMNT_CUST_NM": "Suresh Babu",
      "LOAN_DSBRSMNT_CUST_CD": 7, "LOAN_DSBRSMNT_CUST_ORDR": 7,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "finance", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": "Muge",
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "finance", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": "Muge",
      "loan_account_number": "18010101000023", "loan_account_code": 23,
      "loan_dsbrsmnt_repmnt_type": "Daily", "loan_dsbrsmnt_amnt": "12000.00",
      "loan_dsbrsmnt_intrst_amnt": "1200.00", "loan_dsbrsmnt_tot_instlmnt": 100,
      "loan_dsbrsmnt_prcsng_fee_amnt": "120.00", "loan_dsbrsmnt_instlmnt_amnt": "133.20",
      "loan_dsbrsmnt_dflt_pay_amnt": "133.20", "loan_dsbrsmnt_bad_loan_days": 25,
      "loan_dsbrsmnt_mode": "Cash", "loan_dsbrsmnt_comnt": "Cash loan for daily needs",
      "loan_dsbrsmnt_dt": "2026-02-02", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-02-02T11:00:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-02-02T11:00:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 34, "loan_dsbrsmnt_line_id": 35, "loan_dsbrsmnt_area_id": 18,
      "loan_dsbrsmnt_cust_id": 106, "loan_dsbrsmnt_created_by": 8, "loan_dsbrsmnt_updtd_by": 8
    },
    {
      "id": 10, "LOAN_DSBRSMNT_BRNCH_NM": "Tiruvannamalaisssss", "LOAN_DSBRSMNT_LINE_NM": "Sengammmm",
      "LOAN_DSBRSMNT_AREA_NM": "Senji Road", "LOAN_DSBRSMNT_CUST_NM": "Suresh Babu",
      "LOAN_DSBRSMNT_CUST_CD": 7, "LOAN_DSBRSMNT_CUST_ORDR": 7,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "finance", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": "Muge",
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "finance", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": "Muge",
      "loan_account_number": "18010101000024", "loan_account_code": 24,
      "loan_dsbrsmnt_repmnt_type": "Weekly", "loan_dsbrsmnt_amnt": "35000.00",
      "loan_dsbrsmnt_intrst_amnt": "3500.00", "loan_dsbrsmnt_tot_instlmnt": 52,
      "loan_dsbrsmnt_prcsng_fee_amnt": "350.00", "loan_dsbrsmnt_instlmnt_amnt": "748.08",
      "loan_dsbrsmnt_dflt_pay_amnt": "748.08", "loan_dsbrsmnt_bad_loan_days": 45,
      "loan_dsbrsmnt_mode": "Both", "loan_dsbrsmnt_online_amnt": "20000.00", "loan_dsbrsmnt_cash_amnt": "15000.00",
      "loan_dsbrsmnt_comnt": "Mixed mode disbursement",
      "loan_dsbrsmnt_online_cmt": "20k via UPI transfer", "loan_dsbrsmnt_cash_cmt": "15k cash at counter",
      "loan_dsbrsmnt_dt": "2026-02-04", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-02-04T15:30:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-02-04T15:30:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 34, "loan_dsbrsmnt_line_id": 35, "loan_dsbrsmnt_area_id": 18,
      "loan_dsbrsmnt_cust_id": 106, "loan_dsbrsmnt_created_by": 8, "loan_dsbrsmnt_updtd_by": 8
    },
    {
      "id": 11, "LOAN_DSBRSMNT_BRNCH_NM": "Sholinganallur new", "LOAN_DSBRSMNT_LINE_NM": "Sholsssss",
      "LOAN_DSBRSMNT_AREA_NM": "Karappakkam -II", "LOAN_DSBRSMNT_CUST_NM": "Anitha Reddy",
      "LOAN_DSBRSMNT_CUST_CD": 8, "LOAN_DSBRSMNT_CUST_ORDR": 8,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "finance", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": "Muge",
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "finance", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": "Muge",
      "loan_account_number": "18000202000025", "loan_account_code": 25,
      "loan_dsbrsmnt_repmnt_type": "Monthly", "loan_dsbrsmnt_amnt": "60000.00",
      "loan_dsbrsmnt_intrst_amnt": "6000.00", "loan_dsbrsmnt_tot_instlmnt": 12,
      "loan_dsbrsmnt_prcsng_fee_amnt": "600.00", "loan_dsbrsmnt_instlmnt_amnt": "5550.00",
      "loan_dsbrsmnt_dflt_pay_amnt": "5550.00", "loan_dsbrsmnt_bad_loan_days": 60,
      "loan_dsbrsmnt_mode": "Online", "loan_dsbrsmnt_comnt": "Education loan - online mode",
      "loan_dsbrsmnt_dt": "2026-01-22", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-01-22T10:15:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-01-22T10:15:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 33, "loan_dsbrsmnt_line_id": 38, "loan_dsbrsmnt_area_id": 24,
      "loan_dsbrsmnt_cust_id": 107, "loan_dsbrsmnt_created_by": 9, "loan_dsbrsmnt_updtd_by": 9
    },
    {
      "id": 12, "LOAN_DSBRSMNT_BRNCH_NM": "Sholinganallur new", "LOAN_DSBRSMNT_LINE_NM": "Sholsssss",
      "LOAN_DSBRSMNT_AREA_NM": "Karappakkam -II", "LOAN_DSBRSMNT_CUST_NM": "Kumar Swamy",
      "LOAN_DSBRSMNT_CUST_CD": 9, "LOAN_DSBRSMNT_CUST_ORDR": 9,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "finance", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": "Muge",
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "finance", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": "Muge",
      "loan_account_number": "18000202000026", "loan_account_code": 26,
      "loan_dsbrsmnt_repmnt_type": "Daily", "loan_dsbrsmnt_amnt": "8000.00",
      "loan_dsbrsmnt_intrst_amnt": "800.00", "loan_dsbrsmnt_tot_instlmnt": 100,
      "loan_dsbrsmnt_prcsng_fee_amnt": "80.00", "loan_dsbrsmnt_instlmnt_amnt": "88.80",
      "loan_dsbrsmnt_dflt_pay_amnt": "88.80", "loan_dsbrsmnt_bad_loan_days": 20,
      "loan_dsbrsmnt_mode": "Cash", "loan_dsbrsmnt_comnt": "Small cash loan",
      "loan_dsbrsmnt_dt": "2026-02-05", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-02-05T09:30:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-02-05T09:30:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 33, "loan_dsbrsmnt_line_id": 38, "loan_dsbrsmnt_area_id": 24,
      "loan_dsbrsmnt_cust_id": 108, "loan_dsbrsmnt_created_by": 8, "loan_dsbrsmnt_updtd_by": 8
    },
    {
      "id": 13, "LOAN_DSBRSMNT_BRNCH_NM": "Tiruvannamalaisssss", "LOAN_DSBRSMNT_LINE_NM": "Sengammmm",
      "LOAN_DSBRSMNT_AREA_NM": "Senji Road", "LOAN_DSBRSMNT_CUST_NM": "Deepa Venkat",
      "LOAN_DSBRSMNT_CUST_CD": 10, "LOAN_DSBRSMNT_CUST_ORDR": 10,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "fin", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": null,
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "fin", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": null,
      "loan_account_number": "18010101000027", "loan_account_code": 27,
      "loan_dsbrsmnt_repmnt_type": "Monthly", "loan_dsbrsmnt_amnt": "90000.00",
      "loan_dsbrsmnt_intrst_amnt": "9000.00", "loan_dsbrsmnt_tot_instlmnt": 10,
      "loan_dsbrsmnt_prcsng_fee_amnt": "900.00", "loan_dsbrsmnt_instlmnt_amnt": "9990.00",
      "loan_dsbrsmnt_dflt_pay_amnt": "9990.00", "loan_dsbrsmnt_bad_loan_days": 90,
      "loan_dsbrsmnt_mode": "Both", "loan_dsbrsmnt_online_amnt": "70000.00", "loan_dsbrsmnt_cash_amnt": "20000.00",
      "loan_dsbrsmnt_comnt": "Home renovation loan - both modes",
      "loan_dsbrsmnt_online_cmt": "70k via RTGS to current account", "loan_dsbrsmnt_cash_cmt": "20k cash for immediate expenses",
      "loan_dsbrsmnt_dt": "2026-01-30", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-01-30T14:45:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-01-30T14:45:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 34, "loan_dsbrsmnt_line_id": 35, "loan_dsbrsmnt_area_id": 18,
      "loan_dsbrsmnt_cust_id": 109, "loan_dsbrsmnt_created_by": 9, "loan_dsbrsmnt_updtd_by": 9
    },
    {
      "id": 14, "LOAN_DSBRSMNT_BRNCH_NM": "Sholinganallur new", "LOAN_DSBRSMNT_LINE_NM": "Sholsssss",
      "LOAN_DSBRSMNT_AREA_NM": "Karappakkam -II", "LOAN_DSBRSMNT_CUST_NM": "Naveen Krishna",
      "LOAN_DSBRSMNT_CUST_CD": 11, "LOAN_DSBRSMNT_CUST_ORDR": 11,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "finance", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": "Muge",
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "finance", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": "Muge",
      "loan_account_number": "18000202000028", "loan_account_code": 28,
      "loan_dsbrsmnt_repmnt_type": "Weekly", "loan_dsbrsmnt_amnt": "18000.00",
      "loan_dsbrsmnt_intrst_amnt": "1800.00", "loan_dsbrsmnt_tot_instlmnt": 52,
      "loan_dsbrsmnt_prcsng_fee_amnt": "180.00", "loan_dsbrsmnt_instlmnt_amnt": "384.23",
      "loan_dsbrsmnt_dflt_pay_amnt": "384.23", "loan_dsbrsmnt_bad_loan_days": 35,
      "loan_dsbrsmnt_mode": "Online", "loan_dsbrsmnt_comnt": "Business working capital",
      "loan_dsbrsmnt_dt": "2026-01-12", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-01-12T13:20:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-01-12T13:20:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 33, "loan_dsbrsmnt_line_id": 38, "loan_dsbrsmnt_area_id": 24,
      "loan_dsbrsmnt_cust_id": 110, "loan_dsbrsmnt_created_by": 8, "loan_dsbrsmnt_updtd_by": 8
    },
    {
      "id": 15, "LOAN_DSBRSMNT_BRNCH_NM": "Tiruvannamalaisssss", "LOAN_DSBRSMNT_LINE_NM": "Sengammmm",
      "LOAN_DSBRSMNT_AREA_NM": "Senji Road", "LOAN_DSBRSMNT_CUST_NM": "Sangeetha Moorthy",
      "LOAN_DSBRSMNT_CUST_CD": 12, "LOAN_DSBRSMNT_CUST_ORDR": 12,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "fin", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": null,
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "fin", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": null,
      "loan_account_number": "18010101000029", "loan_account_code": 29,
      "loan_dsbrsmnt_repmnt_type": "Daily", "loan_dsbrsmnt_amnt": "22000.00",
      "loan_dsbrsmnt_intrst_amnt": "2200.00", "loan_dsbrsmnt_tot_instlmnt": 100,
      "loan_dsbrsmnt_prcsng_fee_amnt": "220.00", "loan_dsbrsmnt_instlmnt_amnt": "244.20",
      "loan_dsbrsmnt_dflt_pay_amnt": "244.20", "loan_dsbrsmnt_bad_loan_days": 28,
      "loan_dsbrsmnt_mode": "Cash", "loan_dsbrsmnt_comnt": "Daily cash collection loan",
      "loan_dsbrsmnt_dt": "2026-02-01", "loan_dsbrsmnt_status": "Active",
      "loan_dsbrsmnt_created_ts": "2026-02-01T08:00:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-02-01T08:00:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 34, "loan_dsbrsmnt_line_id": 35, "loan_dsbrsmnt_area_id": 18,
      "loan_dsbrsmnt_cust_id": 111, "loan_dsbrsmnt_created_by": 9, "loan_dsbrsmnt_updtd_by": 9
    }
  ];

  // ─── Completed dummy data (status: Completed) ─────────────────────────────
  const completedDummyData = [
    {
      "id": 101, "LOAN_DSBRSMNT_BRNCH_NM": "Sholinganallur new", "LOAN_DSBRSMNT_LINE_NM": "Sholsssss",
      "LOAN_DSBRSMNT_AREA_NM": "Karappakkam -II", "LOAN_DSBRSMNT_CUST_NM": "Karthik Rajan",
      "LOAN_DSBRSMNT_CUST_CD": 20, "LOAN_DSBRSMNT_CUST_ORDR": 1,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "finance", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": "Muge",
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "finance", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": "Muge",
      "loan_account_number": "18000202000030", "loan_account_code": 30,
      "loan_dsbrsmnt_repmnt_type": "Daily", "loan_dsbrsmnt_amnt": "45000.00",
      "loan_dsbrsmnt_intrst_amnt": "4500.00", "loan_dsbrsmnt_tot_instlmnt": 100,
      "loan_dsbrsmnt_prcsng_fee_amnt": "450.00", "loan_dsbrsmnt_instlmnt_amnt": "495.00",
      "loan_dsbrsmnt_dflt_pay_amnt": "495.00", "loan_dsbrsmnt_bad_loan_days": 30,
      "loan_dsbrsmnt_mode": "Online", "loan_dsbrsmnt_comnt": "Completed loan - all instalments paid",
      "loan_dsbrsmnt_dt": "2025-03-01", "loan_dsbrsmnt_status": "Completed",
      "loan_dsbrsmnt_created_ts": "2025-03-01T10:00:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-01-10T10:00:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 33, "loan_dsbrsmnt_line_id": 38, "loan_dsbrsmnt_area_id": 24,
      "loan_dsbrsmnt_cust_id": 201, "loan_dsbrsmnt_created_by": 8, "loan_dsbrsmnt_updtd_by": 8
    },
    {
      "id": 102, "LOAN_DSBRSMNT_BRNCH_NM": "Tiruvannamalaisssss", "LOAN_DSBRSMNT_LINE_NM": "Sengammmm",
      "LOAN_DSBRSMNT_AREA_NM": "Senji Road", "LOAN_DSBRSMNT_CUST_NM": "Bala Murugan",
      "LOAN_DSBRSMNT_CUST_CD": 21, "LOAN_DSBRSMNT_CUST_ORDR": 2,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "finance", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": "Muge",
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "finance", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": "Muge",
      "loan_account_number": "18010101000031", "loan_account_code": 31,
      "loan_dsbrsmnt_repmnt_type": "Monthly", "loan_dsbrsmnt_amnt": "80000.00",
      "loan_dsbrsmnt_intrst_amnt": "8000.00", "loan_dsbrsmnt_tot_instlmnt": 12,
      "loan_dsbrsmnt_prcsng_fee_amnt": "800.00", "loan_dsbrsmnt_instlmnt_amnt": "7400.00",
      "loan_dsbrsmnt_dflt_pay_amnt": "7400.00", "loan_dsbrsmnt_bad_loan_days": 60,
      "loan_dsbrsmnt_mode": "Both", "loan_dsbrsmnt_online_amnt": "50000.00", "loan_dsbrsmnt_cash_amnt": "30000.00",
      "loan_dsbrsmnt_comnt": "Home loan fully repaid",
      "loan_dsbrsmnt_online_cmt": "50k via NEFT", "loan_dsbrsmnt_cash_cmt": "30k cash at branch",
      "loan_dsbrsmnt_dt": "2025-01-10", "loan_dsbrsmnt_status": "Completed",
      "loan_dsbrsmnt_created_ts": "2025-01-10T09:00:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-01-12T09:00:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 34, "loan_dsbrsmnt_line_id": 35, "loan_dsbrsmnt_area_id": 18,
      "loan_dsbrsmnt_cust_id": 202, "loan_dsbrsmnt_created_by": 9, "loan_dsbrsmnt_updtd_by": 9
    },
    {
      "id": 103, "LOAN_DSBRSMNT_BRNCH_NM": "Sholinganallur new", "LOAN_DSBRSMNT_LINE_NM": "Sholsssss",
      "LOAN_DSBRSMNT_AREA_NM": "Karappakkam -II", "LOAN_DSBRSMNT_CUST_NM": "Selvi Natarajan",
      "LOAN_DSBRSMNT_CUST_CD": 22, "LOAN_DSBRSMNT_CUST_ORDR": 3,
      "LOAN_DSBRSMNT_CREATED_BY_NM": "fin", "LOAN_DSBRSMNT_CREATED_BY_FULL_NM": null,
      "LOAN_DSBRSMNT_UPDTD_BY_NM": "fin", "LOAN_DSBRSMNT_UPDTD_BY_FULL_NM": null,
      "loan_account_number": "18000202000032", "loan_account_code": 32,
      "loan_dsbrsmnt_repmnt_type": "Weekly", "loan_dsbrsmnt_amnt": "25000.00",
      "loan_dsbrsmnt_intrst_amnt": "2500.00", "loan_dsbrsmnt_tot_instlmnt": 52,
      "loan_dsbrsmnt_prcsng_fee_amnt": "250.00", "loan_dsbrsmnt_instlmnt_amnt": "529.81",
      "loan_dsbrsmnt_dflt_pay_amnt": "529.81", "loan_dsbrsmnt_bad_loan_days": 45,
      "loan_dsbrsmnt_mode": "Cash", "loan_dsbrsmnt_comnt": "Weekly cash loan - fully closed",
      "loan_dsbrsmnt_dt": "2025-02-15", "loan_dsbrsmnt_status": "Completed",
      "loan_dsbrsmnt_created_ts": "2025-02-15T11:00:00.000000Z", "loan_dsbrsmnt_updtd_ts": "2026-02-16T11:00:00.000000Z",
      "loan_dsbrsmnt_brnch_id": 33, "loan_dsbrsmnt_line_id": 38, "loan_dsbrsmnt_area_id": 24,
      "loan_dsbrsmnt_cust_id": 203, "loan_dsbrsmnt_created_by": 8, "loan_dsbrsmnt_updtd_by": 8
    }
  ];

  // ─── Lifecycle ─────────────────────────────────────────────────────────────
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

  useEffect(() => { fetchLoanData(); }, []);

  // Load completed data when COMPLETED tab is first opened
  useEffect(() => {
    if (activeTab === 'completed' && completedLoans.length === 0) {
      fetchCompletedLoanData();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollableDiv = document.getElementById('scrollableDiv');
      if (scrollableDiv) {
        const currentScrollY = scrollableDiv.scrollTop;
        if (currentScrollY > lastScrollY && currentScrollY > 50 && accordionOpen) {
          setAccordionOpen(false);
        }
        setLastScrollY(currentScrollY);
      }
    };
    const scrollableDiv = document.getElementById('scrollableDiv');
    if (scrollableDiv) {
      scrollableDiv.addEventListener('scroll', handleScroll);
      return () => scrollableDiv.removeEventListener('scroll', handleScroll);
    }
  }, [lastScrollY, accordionOpen]);

  useEffect(() => { filterCustomers(); }, [showAllCustomers, loans]);

  // ─── Data fetching ─────────────────────────────────────────────────────────
  const fetchLoanData = async () => {
    try {
      setLoading(true);
      processApiData(dummyApiData);
    } catch (error) {
      console.error('Error fetching loan data:', error);
      setLoans([]);
      setPagination({ displayed: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedLoanData = async () => {
    try {
      setCompletedLoading(true);
      // Replace with real API call when ready:
      // const response = await GET(`${DISBURSE_LOAN}?status=Completed`);
      // if (response?.status === 200 && response.data) {
      //   processCompletedApiData(response.data);
      // }
      processCompletedApiData(completedDummyData);
    } catch (error) {
      console.error('Error fetching completed loan data:', error);
      setCompletedLoans([]);
      setCompletedPagination({ displayed: 0, total: 0 });
    } finally {
      setCompletedLoading(false);
    }
  };

  // ─── Shared grouping logic ─────────────────────────────────────────────────
  const groupByCustomer = (apiData) => {
    const customerMap = {};
    apiData.forEach(loan => {
      const custId = loan.loan_dsbrsmnt_cust_id;
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
          branchId: loan.loan_dsbrsmnt_brnch_id,
          lineId: loan.loan_dsbrsmnt_line_id,
          areaId: loan.loan_dsbrsmnt_area_id,
          loans: [],
        };
      }
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
        loan_dsbrsmnt_online_amnt: loan.loan_dsbrsmnt_online_amnt,
        loan_dsbrsmnt_cash_amnt: loan.loan_dsbrsmnt_cash_amnt,
        loan_dsbrsmnt_online_cmt: loan.loan_dsbrsmnt_online_cmt,
        loan_dsbrsmnt_cash_cmt: loan.loan_dsbrsmnt_cash_cmt,
        loan_dsbrsmnt_dt: loan.loan_dsbrsmnt_dt,
        loan_dsbrsmnt_status: loan.loan_dsbrsmnt_status,
        loan_dsbrsmnt_created_ts: loan.loan_dsbrsmnt_created_ts,
        loan_dsbrsmnt_updtd_ts: loan.loan_dsbrsmnt_updtd_ts,
        loan_dsbrsmnt_brnch_id: loan.loan_dsbrsmnt_brnch_id,
        loan_dsbrsmnt_line_id: loan.loan_dsbrsmnt_line_id,
        loan_dsbrsmnt_area_id: loan.loan_dsbrsmnt_area_id,
        loan_dsbrsmnt_cust_id: loan.loan_dsbrsmnt_cust_id,
        loan_dsbrsmnt_created_by: loan.loan_dsbrsmnt_created_by,
        loan_dsbrsmnt_updtd_by: loan.loan_dsbrsmnt_updtd_by,
        LOAN_DSBRSMNT_CREATED_BY_NM: loan.LOAN_DSBRSMNT_CREATED_BY_NM,
        LOAN_DSBRSMNT_CREATED_BY_FULL_NM: loan.LOAN_DSBRSMNT_CREATED_BY_FULL_NM,
        LOAN_DSBRSMNT_UPDTD_BY_NM: loan.LOAN_DSBRSMNT_UPDTD_BY_NM,
        LOAN_DSBRSMNT_UPDTD_BY_FULL_NM: loan.LOAN_DSBRSMNT_UPDTD_BY_FULL_NM,
        loanAccountNumber: loan.loan_account_number,
        loanAmount: loan.loan_dsbrsmnt_amnt,
      });
    });
    return Object.values(customerMap);
  };

  const processApiData = (apiData) => {
    const customersArray = groupByCustomer(apiData);
    setLoans(customersArray);
    setPagination({ displayed: Math.min(PAGE_SIZE, customersArray.length), total: customersArray.length });
  };

  const processCompletedApiData = (apiData) => {
    const customersArray = groupByCustomer(apiData);
    setCompletedLoans(customersArray);
    setDisplayedCompletedLoans(customersArray);
    setCompletedPagination({ displayed: Math.min(PAGE_SIZE, customersArray.length), total: customersArray.length });
  };

  const filterCustomers = () => {
    let filtered = [...loans];
    if (!showAllCustomers) {
      filtered = filtered.filter(customer => customer.loans && customer.loans.length > 0);
    }
    setDisplayedLoans(filtered);
    setPagination({ displayed: Math.min(PAGE_SIZE, filtered.length), total: filtered.length });
  };

  const loadMoreCustomers = () => {
    setPagination(prev => ({ ...prev, displayed: Math.min(prev.displayed + PAGE_SIZE, prev.total) }));
  };

  const loadMoreCompletedCustomers = () => {
    setCompletedPagination(prev => ({ ...prev, displayed: Math.min(prev.displayed + PAGE_SIZE, prev.total) }));
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleLineChange = async (lineId) => {
    setSelectedLineId(lineId);
    searchForm.setFieldsValue({ areaIds: [] });
    if (!lineId) { setFilteredAreaList([]); return; }
    try {
      setAreaLoading(true);
      const response = await GET(`api/area_dd?line_id=${lineId}`);
      if (response?.status === 200) { setFilteredAreaList(response.data); }
      else { notification.error({ message: "Failed to fetch areas" }); setFilteredAreaList([]); }
    } catch (error) {
      console.error("Error:", error); setFilteredAreaList([]);
    } finally { setAreaLoading(false); }
  };

  const getLastNonZeroDigits = (accountNumber, n = 6) => {
    if (!accountNumber) return '';
    const lastNDigits = String(accountNumber).slice(-n);
    const withoutLeadingZeros = lastNDigits.replace(/^0+/, '');
    return withoutLeadingZeros || '0';
  };
  const getMaskedAccountNumber = (accountNumber) => {
  if (!accountNumber) return '';
  const str = String(accountNumber);
  const lastFive = str.slice(-5);
  const visibleSuffix = lastFive.replace(/^0+/, '') || lastFive.slice(-1);
  const maskCount = str.length - visibleSuffix.length;
  return 'x'.repeat(maskCount) + visibleSuffix;
};

  const handleAddLoan = (customer) => {
    const customerId = customer.LOAN_DSBRSMNT_CUST_ID || customer.id;
    const customerCode = customer.LOAN_DSBRSMNT_CUST_CD || customer.customerId;
    const customerName = customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM;
    notification.info({ message: 'Add New Loan', description: `Opening loan disbursement form for ${customerName}` });
    navigate(`/new-loan-disbursement/add`, {
      state: { mode: 'add', customerId, customerCode, customerName, branchId: customer.branchId, lineId: customer.lineId, areaId: customer.areaId }
    });
  };

  const handleSwipeStateChange = (customerId, isOpen) => {
    if (isOpen) { setOpenSwipeId(customerId); }
    else if (openSwipeId === customerId) { setOpenSwipeId(null); }
  };

  const handleCompletedSwipeStateChange = (customerId, isOpen) => {
    if (isOpen) { setOpenCompletedSwipeId(customerId); }
    else if (openCompletedSwipeId === customerId) { setOpenCompletedSwipeId(null); }
  };

  const handleExpandToggle = (customer) => {
    setExpandedCustomers(prev => {
      if (prev[customer.id]) return { ...prev, [customer.id]: false };
      setAccordionOpen(false);
      if (isMobile) {
        setTimeout(() => {
          const scrollContainer = document.getElementById('scrollableDiv');
          const element = document.querySelector(`[data-customer-id="${customer.id}"]`);
          if (scrollContainer && element) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            scrollContainer.scrollTo({ top: elementRect.top - containerRect.top + scrollContainer.scrollTop, behavior: 'smooth' });
          }
        }, 350);
      }
      return { [customer.id]: true };
    });
  };

  const handleCompletedExpandToggle = (customer) => {
    setExpandedCompletedCustomers(prev => {
      if (prev[customer.id]) return { ...prev, [customer.id]: false };
      setAccordionOpen(false);
      if (isMobile) {
        setTimeout(() => {
          const scrollContainer = document.getElementById('completedScrollableDiv');
          const element = document.querySelector(`[data-completed-customer-id="${customer.id}"]`);
          if (scrollContainer && element) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            scrollContainer.scrollTo({ top: elementRect.top - containerRect.top + scrollContainer.scrollTop, behavior: 'smooth' });
          }
        }, 350);
      }
      return { [customer.id]: true };
    });
  };

  const handleMenuClick = (action, customer) => {
    if (action === 'Edit') { handleEditCustomer(customer); }
    else if (action === 'View') { handleExpandToggle(customer); }
    else { notification.info({ message: action, description: `Action ${action} for ${customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM}` }); }
  };

  const handleEditCustomer = (customer) => {
    const customerId = customer.LOAN_DSBRSMNT_CUST_ID || customer.id;
    const customerName = customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM;
    const loans = customer.loans || [];
    if (loans.length === 0) { notification.warning({ message: 'No Loans to Edit', description: `${customerName} has no active loans.` }); return; }
    if (loans.length === 1) {
      const loan = loans[0];
      notification.info({ message: 'Edit Loan', description: `Opening edit form for ${customerName}` });
      navigate(`/new-loan-disbursement/${loan.id}`, {
        state: { mode: 'edit', customerId, customerName, loanData: loan, branchId: loan.loan_dsbrsmnt_brnch_id, lineId: loan.loan_dsbrsmnt_line_id, areaId: loan.loan_dsbrsmnt_area_id }
      });
      return;
    }
    setSelectedCustomerForEdit(customer);
    setLoanSelectionModalVisible(true);
    loanSelectionForm.resetFields();
  };

  const handleLoanSelectionOk = () => {
    loanSelectionForm.validateFields().then((values) => {
      const customer = selectedCustomerForEdit;
      const customerId = customer.LOAN_DSBRSMNT_CUST_ID || customer.id;
      const customerName = customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM;
      const selectedLoan = customer.loans?.find(l => String(l.id) === String(values.loanSelection));
      if (selectedLoan) {
        navigate(`/new-loan-disbursement/${selectedLoan.id}`, {
          state: { mode: 'edit', customerId, customerName, loanData: selectedLoan, branchId: selectedLoan.loan_dsbrsmnt_brnch_id, lineId: selectedLoan.loan_dsbrsmnt_line_id, areaId: selectedLoan.loan_dsbrsmnt_area_id }
        });
        setLoanSelectionModalVisible(false);
        loanSelectionForm.resetFields();
        setSelectedCustomerForEdit(null);
      }
    }).catch(info => console.log('Validation Failed:', info));
  };

  const handleLoanSelectionCancel = () => {
    setLoanSelectionModalVisible(false);
    loanSelectionForm.resetFields();
    setSelectedCustomerForEdit(null);
  };

  const onDelete = async (customer) => {
    try {
      const customerName = customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM;
      setLoans(loans.filter(c => c.id !== customer.id));
      notification.success({ message: 'Loan Deleted', description: `Loan for ${customerName} has been removed successfully.`, duration: 3 });
    } catch (error) {
      notification.error({ message: 'Delete Failed', description: 'Failed to delete the loan. Please try again.', duration: 3 });
    }
  };

  // ─── Menus ─────────────────────────────────────────────────────────────────
  const renderCustomerMenu = (customer) => (
    <Menu>
      <Menu.Item key="view" onClick={() => handleMenuClick('View', customer)}>
        <div className="d-flex align-items-center gap-1">
          <span className="mdi mdi-eye text-secondary"></span><span>View Details</span>
        </div>
      </Menu.Item>
      <Menu.Item key="edit" onClick={() => handleMenuClick('Edit', customer)}>
        <div className="d-flex align-items-center gap-1">
          <span className="mdi mdi-pencil text-secondary"></span><span>Edit</span>
        </div>
      </Menu.Item>
      <Menu.Item key="delete">
        <Popconfirm
          title={`Delete loan for ${customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM}?`}
          description="Are you sure you want to delete this loan permanently?"
          icon={<ExclamationCircleOutlined style={{ color: "red" }} />}
          onConfirm={(e) => { e.stopPropagation(); onDelete(customer); }}
          okText="Delete" cancelText="Cancel"
          okButtonProps={{ danger: true, type: "primary" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="d-flex align-items-center gap-1" style={{ color: "red" }}>
            <DeleteFilled style={{ color: "red" }} /><span>Delete</span>
          </div>
        </Popconfirm>
      </Menu.Item>
    </Menu>
  );

  // View-only menu for completed loans (no edit/delete)
  const renderCompletedCustomerMenu = (customer) => (
    <Menu>
      <Menu.Item key="view" onClick={() => handleCompletedExpandToggle(customer)}>
        <div className="d-flex align-items-center gap-1">
          <span className="mdi mdi-eye text-secondary"></span><span>View Details</span>
        </div>
      </Menu.Item>
    </Menu>
  );

  // ─── Render: DISBURSE item ─────────────────────────────────────────────────
  const renderLoanItem = (customer, index) => {
    const hasLoans = customer.loans && customer.loans.length > 0;
    const loanCount = customer.loans?.length || 0;
    const firstLoan = customer.loans?.[0] || null;
    const accountSuffix = firstLoan ? getLastNonZeroDigits(firstLoan.loan_account_number, 6) : '';

    if (isMobile) {
      const isExpanded = expandedCustomers[customer.id];
      return (
        <div key={customer.id} className="loan-mobile-item-wrapper" style={{ marginBottom: '12px' }} data-customer-id={customer.id}>
          <div style={{ position: 'relative' }}>
            <SwipeablePanel
              item={{ ...customer, lineIndex: index + 1, displayTitle: `${accountSuffix ? accountSuffix + ' - ' : ''}${customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM}` }}
              titleKey="displayTitle" name="loan"
              onSwipeRight={!isExpanded ? () => handleEditCustomer(customer) : undefined}
              onSwipeLeft={!isExpanded ? () => onDelete(customer) : undefined}
              isSwipeOpen={openSwipeId === customer.id}
              onSwipeStateChange={(isOpen) => handleSwipeStateChange(customer.id, isOpen)}
              isExpanded={isExpanded} onExpandToggle={() => handleExpandToggle(customer)} disableAutoScroll={true}
              renderContent={() => <LoanCollapseContent customer={customer} loans={customer.loans || []} />}
            />
            {!isExpanded && openSwipeId !== customer.id && (
              <div style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loanCount < 2 && (
                  <Button type="primary" shape="circle" icon={<PlusOutlined />} size="small"
                    onClick={(e) => { e.stopPropagation(); handleAddLoan(customer); }}
                    className="loan-add-button" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)', backgroundColor: '#28a745', borderColor: '#28a745' }}
                  />
                )}
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '35px', height: '35px', padding: 0, border: '1px solid #d9d9d9', borderRadius: '17.5px', backgroundColor: '#fff', color: 'rgba(0,0,0,0.88)', fontWeight: '600', fontSize: '20px', boxShadow: '0 2px 0 rgba(0,0,0,0.02)', marginRight: '5px' }}>
                  {loanCount}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={customer.id} className="loan-customer-list-item-wrapper">
        <List.Item className={expandedCustomers[customer.id] ? "loan-customer-list-item loan-list-item-expanded" : "loan-customer-list-item"}>
          <List.Item.Meta
            avatar={<div className="loan-customer-index-badge">{index + 1}</div>}
            title={
              <div className="loan-customer-title-container">
                <div onClick={() => handleExpandToggle(customer)} style={{ flex: 1, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                      <span className="loan-customer-name">{accountSuffix ? `${accountSuffix} - ` : ''}{customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM}</span>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '38px', height: '38px', border: '1px solid #d9d9d9', borderRadius: '19px', backgroundColor: '#fff', fontWeight: '600', fontSize: '22px', boxShadow: '0 2px 0 rgba(0,0,0,0.02)', marginRight: '20px' }}>{loanCount}</div>
                    </div>
                    {hasLoans ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        {customer.loans.map((loan, idx) => (
                          <div key={idx} style={{ fontSize: '13px', color: '#595959', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{idx + 1}. {loan.loanAccountNumber || loan.loan_account_number} - ₹{parseFloat(loan.loanAmount || loan.loan_dsbrsmnt_amnt).toLocaleString()}</span>
                            <Tag color={loan.loan_dsbrsmnt_mode === 'Online' ? 'cyan' : loan.loan_dsbrsmnt_mode === 'Cash' ? 'gold' : loan.loan_dsbrsmnt_mode === 'Both' ? 'purple' : 'default'} style={{ fontSize: '11px' }}>{loan.loan_dsbrsmnt_mode}</Tag>
                          </div>
                        ))}
                      </div>
                    ) : (<Tag color="orange" style={{ width: 'fit-content' }}>No active loans</Tag>)}
                  </div>
                </div>
                <div className="loan-customer-actions">
                  {loanCount < 2 && (
                    <Button type="primary" shape="circle" icon={<PlusOutlined />} size="small" className="loan-add-button"
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
        {expandedCustomers[customer.id] && (
          <div className="loan-collapse-content" style={{ padding: '16px', background: '#fafafa' }}>
            <LoanCollapseContent customer={customer} loans={customer.loans || []} />
          </div>
        )}
      </div>
    );
  };

  // ─── Render: COMPLETED item ────────────────────────────────────────────────
  const renderCompletedLoanItem = (customer, index) => {
    const loanCount = customer.loans?.length || 0;
    const firstLoan = customer.loans?.[0] || null;
    const accountSuffix = firstLoan ? getLastNonZeroDigits(firstLoan.loan_account_number, 6) : '';

    if (isMobile) {
      const isExpanded = expandedCompletedCustomers[customer.id];
      return (
        <div key={customer.id} className="loan-mobile-item-wrapper" style={{ marginBottom: '12px' }} data-completed-customer-id={customer.id}>
          <div style={{ position: 'relative' }}>
            <SwipeablePanel
              item={{ ...customer, lineIndex: index + 1, displayTitle: `${accountSuffix ? accountSuffix + ' - ' : ''}${customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM}` }}
              titleKey="displayTitle" name="completed-loan"
              isSwipeOpen={openCompletedSwipeId === customer.id}
              onSwipeStateChange={(isOpen) => handleCompletedSwipeStateChange(customer.id, isOpen)}
              isExpanded={isExpanded} onExpandToggle={() => handleCompletedExpandToggle(customer)} disableAutoScroll={true}
              renderContent={() => <LoanCollapseContent customer={customer} loans={customer.loans || []} />}
            />
            {!isExpanded && openCompletedSwipeId !== customer.id && (
              <div style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
               <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '35px', height: '35px', padding: 0, border: '1px solid #d9d9d9', borderRadius: '17.5px', backgroundColor: '#fff', color: 'rgba(0,0,0,0.88)', fontWeight: '600', fontSize: '20px', boxShadow: '0 2px 0 rgba(0,0,0,0.02)', marginRight: '5px' }}>{loanCount}</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Desktop
    return (
      <div key={customer.id} className="loan-customer-list-item-wrapper">
        <List.Item className={expandedCompletedCustomers[customer.id] ? "loan-customer-list-item loan-list-item-expanded" : "loan-customer-list-item"}>
          <List.Item.Meta
            avatar={<div className="loan-customer-index-badge">{index + 1}</div>}
            title={
              <div className="loan-customer-title-container">
                <div onClick={() => handleCompletedExpandToggle(customer)} style={{ flex: 1, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                      <span className="loan-customer-name">{accountSuffix ? `${accountSuffix} - ` : ''}{customer.customerName || customer.LOAN_DSBRSMNT_CUST_NM}</span>
                      {/* Loan count badge in green for completed */}
<div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '38px', height: '38px', border: '1px solid #d9d9d9', borderRadius: '19px', backgroundColor: '#fff', fontWeight: '600', fontSize: '22px', boxShadow: '0 2px 0 rgba(0,0,0,0.02)', marginRight: '20px' }}>{loanCount}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      {customer.loans.map((loan, idx) => (
                        <div key={idx} style={{ fontSize: '13px', color: '#595959', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{idx + 1}. {loan.loanAccountNumber || loan.loan_account_number} - ₹{parseFloat(loan.loanAmount || loan.loan_dsbrsmnt_amnt).toLocaleString()}</span>
                          <Tag color={loan.loan_dsbrsmnt_mode === 'Online' ? 'cyan' : loan.loan_dsbrsmnt_mode === 'Cash' ? 'gold' : loan.loan_dsbrsmnt_mode === 'Both' ? 'purple' : 'default'} style={{ fontSize: '11px' }}>{loan.loan_dsbrsmnt_mode}</Tag>
                          <Tag color="green" style={{ fontSize: '11px' }}>Completed</Tag>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* View-only menu — no Add/Edit/Delete for completed */}
                <div className="loan-customer-actions">
                  <Dropdown overlay={renderCompletedCustomerMenu(customer)} trigger={['click']}>
                    <EllipsisOutlined className="loan-ellipsis-icon" onClick={(e) => e.stopPropagation()} />
                  </Dropdown>
                </div>
              </div>
            }
          />
        </List.Item>
        {expandedCompletedCustomers[customer.id] && (
          <div className="loan-collapse-content" style={{ padding: '16px', background: '#fafafa' }}>
            <LoanCollapseContent customer={customer} loans={customer.loans || []} />
          </div>
        )}
      </div>
    );
  };

  // ─── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="loan-page-content">
      {loading && <Loader />}

      {/* Header */}
      <div className="loan-disbursement-header-container loan-disbursement-header">
        <h2 className="loan-disbursement-title">Loan</h2>
        <div className="loan-disbursement-actions">
          <Button icon={<SwapOutlined rotate={90} />} onClick={() => notification.info({ message: 'Reorder feature coming soon!' })} type="default" className="loan-action-btn">{!isMobile && "Reorder"}</Button>
          <Button icon={<SearchOutlined />} onClick={() => setSearchModalVisible(true)} type="default" className="loan-action-btn">{!isMobile && "Search"}</Button>
          <Button icon={<FilterOutlined />} onClick={() => setFilterModalVisible(true)} type="default" className="loan-action-btn">{!isMobile && "Filter"}</Button>
          <Dropdown overlay={<Menu><Menu.Item key="export"><div className="d-flex align-items-center gap-1"><span className="mdi mdi-export text-secondary"></span><span>Export Data</span></div></Menu.Item><Menu.Item key="settings"><div className="d-flex align-items-center gap-1"><span className="mdi mdi-cog text-secondary"></span><span>Settings</span></div></Menu.Item></Menu>} trigger={['click']}>
            <Button icon={<EllipsisOutlined rotate={90} />} type="default" className="loan-action-btn" />
          </Dropdown>
        </div>
      </div>

      {/* Summary Accordion */}
      <Card className="loan-accordion-card mb-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'sticky', top: '72px', zIndex: 99, backgroundColor: '#fff' }}>
        <Collapse activeKey={accordionOpen ? ['summary'] : []} onChange={() => setAccordionOpen(!accordionOpen)} expandIconPosition='end' style={{ border: 'none', background: 'transparent' }}>
          <Panel
            header={
              <Row justify="space-between" align="middle" style={{ width: '100%' }}>
                <Col><Text style={{ fontSize: '16px', fontWeight: "bold" }}>Date: 03/02/2026</Text></Col>
                <Col><Text style={{ fontSize: '16px', fontWeight: "bold" }}>Bal: 284303</Text></Col>
              </Row>
            }
            key="summary" style={{ border: 'none' }}
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
          </Panel>
        </Collapse>
      </Card>

      {/* Tabs */}
      <Card className="loan-tabs-card" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'sticky', top: accordionOpen ? '220px' : '130px', zIndex: 98, backgroundColor: '#fff', transition: 'top 0.3s ease' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ paddingLeft: '8px' }}>

          {/* DISBURSE Tab */}
          <Tabs.TabPane tab={<span>DISBURSE</span>} key="pay">
            <div style={{ marginBottom: '16px' }}>
              <Checkbox checked={showAllCustomers} onChange={(e) => setShowAllCustomers(e.target.checked)}>Show All Customers</Checkbox>
            </div>
            <div id="scrollableDiv" className="loan-scrollable-div">
              <InfiniteScroll
                dataLength={pagination.displayed} next={loadMoreCustomers} hasMore={hasMoreData}
                loader={<div className="loan-skeleton-container"><Skeleton avatar paragraph={{ rows: 2 }} active /></div>}
                endMessage={displayedLoans.length > 0 && <Divider plain className="loan-divider-container"><span className="loan-divider-star">★ </span><span className="loan-divider-text">End of List</span><span className="loan-divider-star"> ★</span></Divider>}
                scrollableTarget="scrollableDiv"
              >
                <List dataSource={displayedLoans.slice(0, pagination.displayed)} renderItem={renderLoanItem} />
              </InfiniteScroll>
              {displayedLoans.length === 0 && !loading && (
                <div className="loan-no-data"><Text type="secondary" style={{ fontSize: '16px' }}>{showAllCustomers ? 'No customers found' : 'No customers with active loans'}</Text></div>
              )}
            </div>
          </Tabs.TabPane>

          {/* COLLECT Tab */}
          <Tabs.TabPane tab={<span>COLLECT</span>} key="collect">
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <Text type="secondary" style={{ fontSize: '16px', fontStyle: 'italic' }}>Collection feature coming soon...</Text>
            </div>
          </Tabs.TabPane>

          {/* COMPLETED Tab */}
          <Tabs.TabPane tab={<span>COMPLETED</span>} key="completed">
            <div id="completedScrollableDiv" className="loan-scrollable-div">
              {completedLoading ? (
                <div className="loan-skeleton-container">
                  <Skeleton avatar paragraph={{ rows: 2 }} active />
                  <Skeleton avatar paragraph={{ rows: 2 }} active />
                  <Skeleton avatar paragraph={{ rows: 2 }} active />
                </div>
              ) : (
                <InfiniteScroll
                  dataLength={completedPagination.displayed} next={loadMoreCompletedCustomers} hasMore={hasMoreCompletedData}
                  loader={<div className="loan-skeleton-container"><Skeleton avatar paragraph={{ rows: 2 }} active /></div>}
                  endMessage={displayedCompletedLoans.length > 0 && <Divider plain className="loan-divider-container"><span className="loan-divider-star">★ </span><span className="loan-divider-text">End of List</span><span className="loan-divider-star"> ★</span></Divider>}
                  scrollableTarget="completedScrollableDiv"
                >
                  <List dataSource={displayedCompletedLoans.slice(0, completedPagination.displayed)} renderItem={renderCompletedLoanItem} />
                </InfiniteScroll>
              )}
              {displayedCompletedLoans.length === 0 && !completedLoading && (
                <div className="loan-no-data"><Text type="secondary" style={{ fontSize: '16px' }}>No completed loans found</Text></div>
              )}
            </div>
          </Tabs.TabPane>

        </Tabs>
      </Card>

      {/* Search Modal */}
      <Modal title={null} open={searchModalVisible}
        onCancel={() => { setSearchModalVisible(false); searchForm.resetFields(); setSelectedLineId(null); setFilteredAreaList([]); }}
        onOk={() => { searchForm.validateFields().then((values) => { notification.success({ message: 'Search Applied', description: 'Searching with selected criteria...' }); setSearchModalVisible(false); }).catch(info => console.log('Validation Failed:', info)); }}
        width={600} centered okText="Search" cancelText="Cancel"
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}><h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Search Loans</h3></div>
        <Form form={searchForm} layout="vertical">
          <Form.Item name="date" label="Date" rules={[{ required: true, message: "Please select a date" }]}>
            <DatePicker style={{ width: "100%" }} placeholder="Select Date" format="YYYY-MM-DD" size="large" suffixIcon={<CalendarOutlined />} />
          </Form.Item>
          <Form.Item name="lineId" label="Line" rules={[{ required: true, message: "Please select a line" }]}>
            <SelectWithAddon icon={<ApartmentOutlined />} placeholder="Select Line" showSearch size="large" loading={lineLoading} onChange={handleLineChange}
              notFoundContent={lineLoading ? <Spin size="small" /> : "No lines found"}
              filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
            >
              {lineDropdownList.map((line) => (<Select.Option key={line.line_id} value={line.line_id}>{line.line_name}</Select.Option>))}
            </SelectWithAddon>
          </Form.Item>
          <Form.Item name="areaIds" label="Area" rules={[{ required: true, message: "Please select at least one area" }]} style={{ marginBottom: '32px' }}>
            <SelectWithAddon icon={<EnvironmentOutlined />} placeholder={selectedLineId ? "Select Areas" : "Select Line first"} showSearch size="large" mode="multiple"
              loading={areaLoading} disabled={!selectedLineId} allowClear
              notFoundContent={areaLoading ? <Spin size="small" /> : "No areas found"}
              filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
              open={areaDropdownOpen} onDropdownVisibleChange={(open) => setAreaDropdownOpen(open)}
              dropdownRender={(menu) => (<>{menu}<div style={{ padding: '4px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'center' }}><Button style={{ background: "#28a745", color: "white" }} size="small" onClick={() => setAreaDropdownOpen(false)}>Select Done ✓</Button></div></>)}
            >
              {filteredAreaList.map((area) => (<Select.Option key={area.id} value={area.id}>{area.areaName}</Select.Option>))}
            </SelectWithAddon>
          </Form.Item>
        </Form>
      </Modal>

      {/* Filter Modal */}
      <Modal title={<div className="loan-search-modal-title">Filter Options</div>} open={filterModalVisible} onCancel={() => setFilterModalVisible(false)} footer={null}>
        <p className="loan-search-modal-label">Filter by loan status, amount, date, etc.</p>
      </Modal>

      {/* Loan Selection Modal */}
      <Modal title={null} open={loanSelectionModalVisible} onOk={handleLoanSelectionOk} onCancel={handleLoanSelectionCancel} width={500} centered okText="Edit Selected Loan" cancelText="Cancel">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Select Loan to Edit</h3>
          <Text type="secondary" style={{ fontSize: '14px' }}>Customer: {selectedCustomerForEdit?.customerName || selectedCustomerForEdit?.LOAN_DSBRSMNT_CUST_NM}</Text>
        </div>
        <Form form={loanSelectionForm} layout="vertical">
          <Form.Item name="loanSelection" label="Select Loan" rules={[{ required: true, message: "Please select a loan" }]}>
            <Select size="large" placeholder="Choose a loan to edit" allowClear>
             {selectedCustomerForEdit?.loans?.map((loan) => {
  const loanNumber = loan.loanAccountNumber || loan.loan_account_number;
  const loanAmount = loan.loanAmount || loan.loan_dsbrsmnt_amnt;
  const maskedNumber = getMaskedAccountNumber(loanNumber);
  const loanDate = loan.loan_dsbrsmnt_dt
    ? new Date(loan.loan_dsbrsmnt_dt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <Select.Option key={loan.id} value={loan.id}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.5px' }}>
          {maskedNumber}
        </span>
        <Space size="small">
          <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{loanDate}</span>
          <span style={{ fontWeight: 600, color: '#1890ff' }}>
            ₹{parseFloat(loanAmount).toLocaleString()}
          </span>
        </Space>
      </div>
    </Select.Option>
  );
              })}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LoanDisbursementList;