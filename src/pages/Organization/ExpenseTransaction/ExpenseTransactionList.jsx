import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  DeleteFilled,
  ExclamationCircleOutlined,
  EllipsisOutlined,
} from "@ant-design/icons";
import {
  Button,
  FloatButton,
  Modal,
  notification,
  Select,
  Radio,
  List,
  Image,
  Dropdown,
  Menu,
  Popconfirm,
  Divider,
  Skeleton,
  Tag,
  Grid,
  Tooltip,
  Badge,
  Input,
  Spin,
} from "antd";
import Loader from "components/Common/Loader";
import dayjs from "dayjs";
import { DELETE, GET } from "helpers/api_helper";
import { EXPENSE_TRANSACTION } from "helpers/url_helper";
import { useEffect, useState } from "react";
import SwipeablePanel from "components/Common/SwipeablePanel";
import InfiniteScroll from "react-infinite-scroll-component";
import ExpenseTransactionCollapseContent from "../../../components/Common/ExpenseTransactionCollapseContent ";
import lineIcon from "../../../assets/icons/money-currency.png";
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import "./ExpenseTransactionList.css";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { Option } = Select;
const { useBreakpoint } = Grid;

const ExpenseTransactionList = () => {
  const [loading, setLoading] = useState(true);
  const [expenseTransactions, setExpenseTransactions] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [expenseTypeList, setExpenseTypeList] = useState([]);
  const [lineList, setLineList] = useState([]);
  const [lineLoader, setLineLoader] = useState(false);
  const [expenseTypeLoader, setExpenseTypeLoader] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(true);
  const [selectedBranchFromStorage, setSelectedBranchFromStorage] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showReset, setShowReset] = useState(false);

  // Search filters
  const [selectedLine, setSelectedLine] = useState(null); // single value
  const [selectedLineName, setSelectedLineName] = useState("");
  const [dateFilterType, setDateFilterType] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [searchText, setSearchText] = useState("");
  const [searchCriteria, setSearchCriteria] = useState(null);
  const [dateError, setDateError] = useState("");

  // Pagination
  const [expensePagination, setExpensePagination] = useState({});
  const EXPENSES_PAGE_SIZE = 10;

  // Expand states
  const [expandedExpenses, setExpandedExpenses] = useState({});
  const [openSwipeId, setOpenSwipeId] = useState(null);

  const today = dayjs().format('YYYY-MM-DD');

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    const storedBranchId = localStorage.getItem("selected_branch_id");
    const accessToken = localStorage.getItem("access_token");
    setSelectedBranchFromStorage(storedBranchId);

    const fetchData = async () => {
      if (storedBranchId && accessToken) {
        await Promise.all([getExpenseTransactionList(), getLineList()]);
        setLoading(false);
      } else {
        setTimeout(async () => {
          const retryToken = localStorage.getItem("access_token");
          const retryBranch = localStorage.getItem("selected_branch_id");
          if (retryBranch && retryToken) {
            await Promise.all([getExpenseTransactionList(), getLineList()]);
            setLoading(false);
          }
        }, 300);
      }
    };

    fetchData();
  }, []);

  const getExpenseTransactionList = async () => {
    try {
      const response = await GET(EXPENSE_TRANSACTION);
      if (response?.status === 200) {
        const storedBranchId = localStorage.getItem("selected_branch_id");
        let allTransactions = response.data.results || response.data;
        let filteredData = allTransactions;

        if (storedBranchId) {
          const branchIdNumber = parseInt(storedBranchId, 10);
          filteredData = allTransactions.filter(
            (item) => item.branch_id === branchIdNumber
          );
        }

        setOriginalData(filteredData);
        return filteredData;
      }
      return [];
    } catch (error) {
      notification.error({
        message: "Failed to fetch expense transactions",
        description: "An error occurred while loading expense transaction data",
      });
      return [];
    }
  };

  const getLineList = async () => {
    try {
      setLineLoader(true);
      const storedBranchId = localStorage.getItem("selected_branch_id");

      if (!storedBranchId) {
        notification.warning({
          message: "No Branch Selected",
          description: "Please select a branch to load line data",
        });
        setLineLoader(false);
        return [];
      }

      const response = await GET(`api/line_dd/?branch_id=${storedBranchId}`);
      if (response?.status === 200) {
        setLineList(response.data || []);
        setLineLoader(false);
        return response.data || [];
      } else {
        setLineList([]);
        setLineLoader(false);
        return [];
      }
    } catch (error) {
      setLineList([]);
      setLineLoader(false);
      notification.error({
        message: "Failed to fetch line data",
        description: "An error occurred while loading line data",
      });
      return [];
    }
  };

  // ─── Fetch expense types by line_id ──────────────────────────────────────
  const getExpenseTypeList = async (lineId) => {
    try {
      setExpenseTypeLoader(true);
      setExpenseTypeList([]);
      setSearchText("");
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
      notification.error({
        message: "Error",
        description: "Failed to fetch expense types.",
        duration: 5,
      });
    } finally {
      setExpenseTypeLoader(false);
    }
  };

  // ─── Handle line change in modal ─────────────────────────────────────────
  const handleLineChange = (lineId) => {
    setSelectedLine(lineId ?? null);
    setSearchText("");
    setExpenseTypeList([]);
    if (lineId) {
      const matched = lineList.find((l) => l.line_id === lineId);
      const lineName = matched?.line_name || "";
      setSelectedLineName(lineName);
      // Store selected line in localStorage for form to use
      localStorage.setItem("selected_line_id", String(lineId));
      localStorage.setItem("selected_line_name", lineName);
      getExpenseTypeList(lineId);
    } else {
      setSelectedLineName("");
      localStorage.removeItem("selected_line_id");
      localStorage.removeItem("selected_line_name");
    }
  };

  const groupExpensesByLine = (data) => {
    const grouped = {};
    data.forEach((expense) => {
      const lineName = expense.EXPNS_TRNSCTN_LINE_NM || "Uncategorized";
      if (!grouped[lineName]) grouped[lineName] = [];
      grouped[lineName].push(expense);
    });
    return grouped;
  };

  const validateDateRange = (fromDate, toDate) => {
    if (!fromDate || !toDate) {
      setDateError("Please select both from and to dates");
      return false;
    }
    const from = dayjs(fromDate);
    const to = dayjs(toDate);
    const todayDate = dayjs(today);

    if (from.isAfter(to)) {
      setDateError("From date cannot be greater than to date");
      return false;
    }
    if (to.isAfter(todayDate)) {
      setDateError("To date cannot be greater than today");
      return false;
    }
    setDateError("");
    return true;
  };

  const handleDateChange = (field, value) => {
    const newDateRange = { ...dateRange, [field]: value };
    setDateRange(newDateRange);
    if (newDateRange.from && newDateRange.to) {
      validateDateRange(newDateRange.from, newDateRange.to);
    } else {
      setDateError("");
    }
  };

  const initializeLinePagination = (lineName, totalExpenses) => {
    setExpensePagination(prev => ({
      ...prev,
      [lineName]: {
        displayed: Math.min(EXPENSES_PAGE_SIZE, totalExpenses),
        total: totalExpenses
      }
    }));
  };

  const loadMoreExpenses = (lineName) => {
    setExpensePagination(prev => {
      const current = prev[lineName] || { displayed: 0, total: 0 };
      return {
        ...prev,
        [lineName]: {
          ...current,
          displayed: Math.min(current.displayed + EXPENSES_PAGE_SIZE, current.total)
        }
      };
    });
  };

  const handleSearch = () => {
    if (dateFilterType === "range" && (dateRange.from || dateRange.to)) {
      if (!validateDateRange(dateRange.from, dateRange.to)) {
        notification.error({
          message: "Invalid Date Range",
          description: dateError,
        });
        return;
      }
    }

    let filtered = [...originalData];

    // Single line filter
    if (selectedLine) {
      filtered = filtered.filter(item =>
        (item.EXPNS_TRNSCTN_LINE_NM || "Uncategorized") === selectedLineName
      );
    }

    if (dateFilterType === "range" && dateRange.from && dateRange.to) {
      const fromDate = dayjs(dateRange.from).startOf('day');
      const toDate = dayjs(dateRange.to).endOf('day');
      filtered = filtered.filter(item => {
        const expenseDate = dayjs(item.EXPNS_TRNSCTN_CREATED_TS);
        return expenseDate.isSameOrAfter(fromDate) && expenseDate.isSameOrBefore(toDate);
      });
    }

    if (searchText.trim()) {
      const query = searchText.trim().toLowerCase();
      filtered = filtered.filter(item =>
        (item.EXPNS_TYPE_NM || "").toLowerCase().includes(query)
      );
    }

    const criteria = {
      line: selectedLineName || "All Lines",
      dateType: dateFilterType,
      fromDate: dateRange.from ? dayjs(dateRange.from).format('DD-MMM-YYYY') : null,
      toDate: dateRange.to ? dayjs(dateRange.to).format('DD-MMM-YYYY') : null,
      searchText: searchText.trim() || null,
    };

    setSearchCriteria(criteria);
    setExpenseTransactions(filtered);
    const grouped = groupExpensesByLine(filtered);
    setGroupedData(grouped);
    Object.keys(grouped).forEach(lineName => {
      initializeLinePagination(lineName, grouped[lineName].length);
    });

    setSearchModalVisible(false);
    setShowReset(true);
    setHasSearched(true);

    if (filtered.length === 0) {
      notification.warning({
        message: "No Results",
        description: "No expense transactions found matching your search criteria.",
      });
    }
  };

  const handleReset = () => {
    setExpenseTransactions([]);
    setGroupedData({});
    setExpensePagination({});
    setShowReset(false);
    setSearchText("");
    setSelectedLine(null);
    setSelectedLineName("");
    setExpenseTypeList([]);
    setDateFilterType("all");
    setDateRange({ from: "", to: "" });
    setDateError("");
    setSearchCriteria(null);
    setHasSearched(false);
    setTimeout(() => setSearchModalVisible(true), 300);
  };

  const handleDelete = async (record) => {
    try {
      const response = await DELETE(`${EXPENSE_TRANSACTION}${record.EXPNS_TRNSCTN_ID}/`);
      if (response?.status === 204 || response?.status === 200) {
        const updatedData = expenseTransactions.filter(
          (item) => item.EXPNS_TRNSCTN_ID !== record.EXPNS_TRNSCTN_ID
        );
        const updatedOriginalData = originalData.filter(
          (item) => item.EXPNS_TRNSCTN_ID !== record.EXPNS_TRNSCTN_ID
        );
        setExpenseTransactions(updatedData);
        setOriginalData(updatedOriginalData);
        setGroupedData(groupExpensesByLine(updatedData));
        notification.success({
          message: `${record.EXPNS_TYPE_NM?.toUpperCase()} Expense Deleted!`,
          description: "Expense transaction has been deleted successfully",
        });
      }
    } catch (error) {
      notification.error({
        message: "An error occurred",
        description: "Failed to delete expense transaction",
      });
    }
  };

  const handleExpenseAction = (lineName, expenseId) => {
    const key = `${lineName}-${expenseId}`;
    setOpenSwipeId(null);
    setExpandedExpenses((prev) => {
      const newState = { [key]: !prev[key] };
      if (newState[key]) {
        setTimeout(() => {
          const element = document.getElementById(`expense-item-${expenseId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          }
        }, 100);
      }
      return newState;
    });
  };

  const handleSwipeStateChange = (expenseId, isOpen) => {
    if (isOpen) setOpenSwipeId(expenseId);
    else if (openSwipeId === expenseId) setOpenSwipeId(null);
  };

  const handleEditExpense = (expense) => {
    window.location.href = `/expense-transaction/edit/${expense.EXPNS_TRNSCTN_ID}`;
  };

  const searchModal = (
    <Modal
      title={<div className="expense-list-modal-title">Search Expense Transactions</div>}
      open={searchModalVisible}
      onOk={handleSearch}
      onCancel={hasSearched ? () => setSearchModalVisible(false) : undefined}
      okText="Search"
      cancelText="Cancel"
      cancelButtonProps={{ style: hasSearched ? {} : { display: 'none' } }}
      width={600}
      closable={hasSearched}
      maskClosable={hasSearched}
    >
      <div className="expense-list-modal-content">

        {/* Line — single select */}
        <div>
          <p className="expense-list-modal-label">Select Line:</p>
          <Select
            value={selectedLine}
            onChange={handleLineChange}
            style={{ width: "100%" }}
            placeholder={lineLoader ? "Loading lines..." : "Select a line"}
            allowClear
            showSearch
            size="large"
            loading={lineLoader}
            disabled={lineLoader}
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {lineList.map((line) => (
              <Option key={line.line_id} value={line.line_id}>
                {line.line_name}
              </Option>
            ))}
          </Select>
        </div>

        {/* Expense Type — disabled read-only input showing selected line name,
            then a dropdown filtered by that line */}
      

        {/* Date Filter */}
        <div>
          <p className="expense-list-modal-label">Date Filter:</p>
          <Radio.Group
            value={dateFilterType}
            onChange={(e) => {
              setDateFilterType(e.target.value);
              if (e.target.value === "all") {
                setDateRange({ from: "", to: "" });
                setDateError("");
              }
            }}
            style={{ marginBottom: 12 }}
          >
            <Radio value="all">Show All</Radio>
            <Radio value="range">Date Range</Radio>
          </Radio.Group>

          {dateFilterType === "range" && (
            <div className="expense-list-date-filter-container">
              <p className="expense-list-date-filter-label">Select date range:</p>
              <div className="expense-list-date-range-container">
                <input
                  type="date"
                  autoComplete="off"
                  onPaste={(e) => e.preventDefault()}
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  value={dateRange.from}
                  onChange={(e) => handleDateChange("from", e.target.value)}
                  max={dateRange.to || today}
                  className="expense-list-date-input"
                />
                <span className="expense-list-date-separator">to</span>
                <input
                  type="date"
                  autoComplete="off"
                  onPaste={(e) => e.preventDefault()}
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  value={dateRange.to}
                  onChange={(e) => handleDateChange("to", e.target.value)}
                  min={dateRange.from || undefined}
                  max={today}
                  className="expense-list-date-input"
                />
              </div>
              {dateError && (
                <p style={{ color: "#ff4d4f", fontSize: "12px", marginTop: "8px" }}>
                  {dateError}
                </p>
              )}
            </div>
          )}
        </div>
          <div>
          <p className="expense-list-modal-label">Expense Type:</p>
          <Select
            value={searchText || undefined}
            onChange={(val) => setSearchText(val ?? "")}
            style={{ width: "100%" }}
            placeholder={
              expenseTypeLoader
                ? "Loading expense types..."
                : !selectedLine
                ? "Select a line first"
                : expenseTypeList.length === 0
                ? "No expense types available"
                : "Select Expense Type"
            }
            allowClear
            showSearch
            size="large"
            loading={expenseTypeLoader}
            disabled={expenseTypeLoader || !selectedLine}
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
            suffixIcon={expenseTypeLoader ? <Spin size="small" /> : undefined}
          >
            {expenseTypeList.map((type) => (
              <Option key={type.id} value={type.name}>
                {type.name}
              </Option>
            ))}
          </Select>
        </div>

      </div>
    </Modal>
  );

  return (
    <div className="expense-list-page-content">
      {loading && <Loader />}
      {lineLoader && <Loader loadingText="Fetching line details..." />}

      <div className="expense-list-header">
        <h2 className="expense-list-title">Expense Transactions</h2>
        <div className="expense-list-actions">
          <Button
            icon={<SearchOutlined />}
            onClick={() => setSearchModalVisible(true)}
            type="default"
          >
            {!isMobile && "Search Criteria"}
          </Button>
          {showReset && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              title="Reset to Original"
            />
          )}
        </div>
      </div>

      {searchModal}

      {hasSearched && (
        <div id="scrollableDiv" className="expense-list-scrollable-div">
          {showReset && searchCriteria && (
            <>
              <Divider style={{ margin: '5px 0' }} />
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '8px 0'
                }}
              >
                <Tag color="blue" style={{ margin: 0, padding: '4px 8px' }}>
                  Line: {searchCriteria.line}
                </Tag>

                {searchCriteria.dateType === "range" && searchCriteria.fromDate && searchCriteria.toDate ? (
                  <Tag color="green" style={{ margin: 0, padding: '4px 8px' }}>
                    Date: {searchCriteria.fromDate} to {searchCriteria.toDate}
                  </Tag>
                ) : (
                  <Tag color="green" style={{ margin: 0, padding: '4px 8px' }}>
                    Date: All
                  </Tag>
                )}

                <Tag color="purple" style={{ margin: 0, padding: '4px 8px' }}>
                  Expense = {searchCriteria.searchText ? `"${searchCriteria.searchText}"` : "All"}
                </Tag>
              </div>
              <Divider style={{ margin: '5px 0' }} />
            </>
          )}

          {Object.keys(groupedData).map((lineName) => (
            <div key={lineName} className="expense-list-line-group">
              <div className="expense-list-line-header">
                <div className="expense-list-line-title-container">
                  <Image preview={false} src={lineIcon} width={30} height={30} />
                  <span className="expense-list-line-title">{lineName}</span>
                </div>
                <div className={showReset ? "expense-list-badge expense-list-badge-search" : "expense-list-badge"}>
                  {groupedData[lineName].length}
                </div>
              </div>

              <div id={'scrollableDiv-' + lineName} className="expense-list-container">
                <InfiniteScroll
                  dataLength={expensePagination[lineName]?.displayed || EXPENSES_PAGE_SIZE}
                  next={() => loadMoreExpenses(lineName)}
                  hasMore={
                    (expensePagination[lineName]?.displayed || 0) <
                    (expensePagination[lineName]?.total || 0)
                  }
                  loader={
                    <div className="expense-list-skeleton">
                      <Skeleton avatar paragraph={{ rows: 1 }} active />
                    </div>
                  }
                  endMessage={
                    <Divider plain className="expense-list-divider">
                      <span className="expense-list-divider-star">★ </span>
                      <span className="expense-list-divider-text">
                        End of{" "}
                        <span className="expense-list-divider-line-name">{lineName}</span> line{" "}
                        <span className="expense-list-divider-star">★</span>
                      </span>
                    </Divider>
                  }
                  scrollableTarget={'scrollableDiv-' + lineName}
                >
                  <List
                    dataSource={groupedData[lineName].slice(
                      0,
                      expensePagination[lineName]?.displayed || EXPENSES_PAGE_SIZE
                    )}
                    className="expense-list"
                    renderItem={(expense, index) => {
                      const isExpanded = expandedExpenses[lineName + '-' + expense.EXPNS_TRNSCTN_ID];
                      const lineIndex = index + 1;

                      return (
                        <div
                          key={expense.EXPNS_TRNSCTN_ID}
                          id={'expense-item-' + expense.EXPNS_TRNSCTN_ID}
                          className="expense-list-item-wrapper"
                        >
                          {isMobile ? (
                            <SwipeablePanel
                              item={{ ...expense, lineIndex }}
                              index={expense.EXPNS_TRNSCTN_ID}
                              titleKey="EXPNS_TYPE_NM"
                              name="expense-transaction"
                              avatarSrc={lineIcon}
                              onSwipeRight={!isExpanded ? () => handleEditExpense(expense) : undefined}
                              onSwipeLeft={!isExpanded ? () => handleDelete(expense) : undefined}
                              isExpanded={isExpanded}
                              onExpandToggle={() => handleExpenseAction(lineName, expense.EXPNS_TRNSCTN_ID)}
                              renderContent={() => isExpanded ? <ExpenseTransactionCollapseContent expense={expense} /> : null}
                              isSwipeOpen={openSwipeId === expense.EXPNS_TRNSCTN_ID}
                              onSwipeStateChange={(isOpen) => handleSwipeStateChange(expense.EXPNS_TRNSCTN_ID, isOpen)}
                              renderAmount={() => (
                                <span style={{ fontWeight: '600', color: '#1890ff', fontSize: '14px' }}>
                                  ₹{expense.EXPNS_TRNSCTN_AMNT || 0}
                                </span>
                              )}
                            />
                          ) : (
                            <>
                              <List.Item
                                className={isExpanded ? "expense-list-item expense-list-item-expanded" : "expense-list-item"}
                              >
                                <List.Item.Meta
                                  avatar={
                                    <div className="expense-list-avatar-container">
                                      <span className="expense-list-index-badge">{lineIndex}</span>
                                    </div>
                                  }
                                  title={
                                    <div
                                      onClick={() => handleExpenseAction(lineName, expense.EXPNS_TRNSCTN_ID)}
                                      className="expense-list-item-title-container"
                                    >
                                      <div className="expense-list-title-amount">
                                        <span className="expense-list-item-title">{expense.EXPNS_TYPE_NM}</span>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                                          <span className="expense-list-amount" style={{ fontWeight: 600, color: "#1890ff", fontSize: "14px" }}>
                                            ₹{expense.EXPNS_TRNSCTN_AMNT || 0}
                                          </span>
                                          <span style={{ fontSize: "12px", color: "#888", fontWeight: 400 }}>
                                            {dayjs(expense.EXPNS_TRNSCTN_DT).format('DD MMM YYYY')}
                                          </span>
                                        </div>
                                      </div>
                                      <Dropdown
                                        overlay={
                                          <Menu>
                                            <Menu.Item
                                              key="edit"
                                              onClick={(e) => {
                                                e.domEvent.stopPropagation();
                                                handleEditExpense(expense);
                                              }}
                                            >
                                              <div className="d-flex align-items-center gap-1">
                                                <span className="mdi mdi-pencil text-secondary mb-0"></span>
                                                <span>Edit</span>
                                              </div>
                                            </Menu.Item>
                                            <Menu.Item key="delete">
                                              <Popconfirm
                                                title={`Delete expense ${expense.EXPNS_TYPE_NM}?`}
                                                description="Are you sure you want to delete this expense transaction permanently?"
                                                icon={<ExclamationCircleOutlined style={{ color: "red" }} />}
                                                onConfirm={(e) => {
                                                  e.stopPropagation();
                                                  handleDelete(expense);
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
                                        }
                                        trigger={["click"]}
                                      >
                                        <EllipsisOutlined
                                          className="expense-list-ellipsis-icon"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </Dropdown>
                                    </div>
                                  }
                                  description={null}
                                />
                              </List.Item>

                              {isExpanded && (
                                <div className="expense-list-collapse-content">
                                  <ExpenseTransactionCollapseContent expense={expense} />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    }}
                  />
                </InfiniteScroll>
              </div>
            </div>
          ))}

          {Object.keys(groupedData).length === 0 && !loading && (
            <div className="expense-list-no-data">
              <p>No expense transactions found matching your search criteria</p>
            </div>
          )}
        </div>
      )}

      {!hasSearched && !loading && (
        <div className="expense-list-no-search">
          <SearchOutlined className="expense-list-no-search-icon" />
          <p className="expense-list-no-search-title">No Search Performed</p>
          <p className="expense-list-no-search-text">
            Please use the Search button to filter and view expense transactions.
          </p>
        </div>
      )}

      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        style={{ right: 24, bottom: 24 }}
        onClick={() => window.location.href = '/expense-transaction/add'}
      />
    </div>
  );
};

export default ExpenseTransactionList;