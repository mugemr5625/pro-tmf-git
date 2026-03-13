import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button, notification, Grid, List, Image, Dropdown, Menu, Modal,
  Divider, Skeleton, FloatButton, Select, Radio, Popconfirm, Tag
} from "antd";
import { DELETE, GET } from "helpers/api_helper";
import { INVESTMENT } from "helpers/url_helper";
import Loader from "components/Common/Loader";
import SwipeablePanel from "components/Common/SwipeablePanel";
import { EllipsisOutlined, SearchOutlined, ReloadOutlined, PlusOutlined, DeleteFilled, ExclamationCircleOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import lineIcon from "../../../assets/icons/profits (1).png";
import dayjs from 'dayjs';
import "./InvestmentList.css";

import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import InvestmentCollapseContent from "components/Common/InvestmentCollapseContent";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { Option } = Select;

const InvestmentList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [originalData, setOriginalData] = useState([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [expandedInvestments, setExpandedInvestments] = useState({});
  const [expandedLines, setExpandedLines] = useState({});
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [selectedBranchFromStorage, setSelectedBranchFromStorage] = useState(null);
  const [selectedBranchIdFromStorage, setSelectedBranchIdFromStorage] = useState(null);
  const [investmentsPagination, setInvestmentsPagination] = useState({});
  const [firstLoad, setFirstLoad] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [lineList, setLineList] = useState([]);
  const [lineLoader, setLineLoader] = useState(false);

  // ── Single mandatory line select ──────────────────────────────────────────
  const [selectedLine, setSelectedLine] = useState(null);
  const [lineError, setLineError] = useState("");

  const [dateFilterType, setDateFilterType] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [searchCriteria, setSearchCriteria] = useState(null);
  const [dateError, setDateError] = useState("");

  const INVESTMENTS_PAGE_SIZE = 10;
  const today = dayjs().format('YYYY-MM-DD');

  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // ── Date format helper: DD/MM/YYYY ────────────────────────────────────────
  const formatDate = (date) => {
    if (!date) return "";
    return dayjs(date).format('DD/MM/YYYY');
  };

  useEffect(() => {
    const storedBranchName = localStorage.getItem("selected_branch_name");
    const storedBranchId = localStorage.getItem("selected_branch_id");
    const accessToken = localStorage.getItem("access_token");

    setSelectedBranchFromStorage(storedBranchName);
    setSelectedBranchIdFromStorage(storedBranchId);

    const fetchData = async () => {
      if (storedBranchId && accessToken) {
        await Promise.all([getInvestmentList(), getLineList()]);
      } else {
        setTimeout(async () => {
          const retryToken = localStorage.getItem("access_token");
          const retryBranchId = localStorage.getItem("selected_branch_id");
          if (retryBranchId && retryToken) {
            await Promise.all([getInvestmentList(), getLineList()]);
          }
        }, 300);
      }
    };

    fetchData();
  }, []);

  // ── Restore saved line selection from localStorage ────────────────────────
  useEffect(() => {
    const savedLineName = localStorage.getItem("selected_line_name");
    if (savedLineName) {
      setSelectedLine(savedLineName);
    }
  }, []);

  useEffect(() => {
    if (firstLoad && !loading && originalData.length > 0) {
      setSearchModalVisible(true);
      setFirstLoad(false);
    }
  }, [firstLoad, loading, originalData]);

  const getLineList = async () => {
    try {
      setLineLoader(true);
      const storedBranchId = localStorage.getItem("selected_branch_id");

      if (!storedBranchId) {
        notification.warning({ message: "No Branch Selected", description: "Please select a branch to load line data" });
        setLineLoader(false);
        return [];
      }

      const response = await GET("api/line_dd");
      if (response?.status === 200) {
        const filteredLines = response.data.filter(
          (item) => item.branch_id === parseInt(storedBranchId)
        );
        setLineList(filteredLines || []);
        setLineLoader(false);
        return filteredLines;
      } else {
        setLineList([]);
        setLineLoader(false);
        return [];
      }
    } catch (error) {
      setLineList([]);
      setLineLoader(false);
      notification.error({ message: "Failed to fetch line data", description: "An error occurred while loading line data" });
      return [];
    }
  };

  const groupInvestmentsByLine = (data) => {
    const grouped = {};
    data.forEach((investment) => {
      const lineName = investment.line_name || "Uncategorized";
      if (!grouped[lineName]) grouped[lineName] = [];
      grouped[lineName].push(investment);
    });
    return grouped;
  };

  const getUniqueLines = () => {
    if (lineList.length === 0) {
      const lines = [...new Set(originalData.map(inv => inv.line_name || "Uncategorized"))];
      return lines.sort();
    }
    const uniqueLines = [...new Set(lineList.map(item => item.line_name || "Uncategorized"))];
    return uniqueLines.sort();
  };

  const handleLineSelection = (value) => {
    setSelectedLine(value ?? null);
    // Clear error as soon as user picks a line
    if (value) setLineError("");
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

  const handleReset = () => {
    setInvestments([]);
    setGroupedData({});
    setInvestmentsPagination({});
    setShowReset(false);
    setSearchText("");
    setSelectedLine(null);
    setLineError("");
    setDateFilterType("all");
    setDateRange({ from: "", to: "" });
    setDateError("");
    setSearchCriteria(null);
    setHasSearched(false);
    localStorage.removeItem("selected_line_id");
    localStorage.removeItem("selected_line_name");
    setTimeout(() => setSearchModalVisible(true), 300);
  };

  const getInvestmentList = async () => {
    try {
      setLoading(true);
      const response = await GET(INVESTMENT);
      if (response?.status === 200) {
        const storedBranchId = localStorage.getItem("selected_branch_id");
        let allInvestments = response.data.results || response.data;
        let filteredData = allInvestments;
        if (storedBranchId) {
          filteredData = allInvestments.filter(
            (item) => item.branch === parseInt(storedBranchId)
          );
        }
        setOriginalData(filteredData);
      } else {
        setOriginalData([]);
      }
    } catch (error) {
      setOriginalData([]);
      notification.error({ message: "Error", description: "Failed to load investments" });
    } finally {
      setLoading(false);
    }
  };

  const initializeLinePagination = (lineName, totalInvestments) => {
    setInvestmentsPagination(prev => ({
      ...prev,
      [lineName]: {
        displayed: Math.min(INVESTMENTS_PAGE_SIZE, totalInvestments),
        total: totalInvestments
      }
    }));
  };

  const loadMoreInvestments = (lineName) => {
    setInvestmentsPagination(prev => {
      const current = prev[lineName] || { displayed: 0, total: 0 };
      return {
        ...prev,
        [lineName]: {
          ...current,
          displayed: Math.min(current.displayed + INVESTMENTS_PAGE_SIZE, current.total)
        }
      };
    });
  };

  const handleDelete = async (record) => {
    try {
      const response = await DELETE(`${INVESTMENT}${record.id}/`);
      if (response?.status === 204 || response?.status === 200) {
        const updatedData = investments.filter((item) => item.id !== record.id);
        const updatedOriginalData = originalData.filter((item) => item.id !== record.id);
        setInvestments(updatedData);
        setOriginalData(updatedOriginalData);
        setGroupedData(groupInvestmentsByLine(updatedData));
        notification.success({
          message: `${record.investment_title_name.toUpperCase()} Investment Deleted!`,
          description: "The investment has been deleted successfully",
        });
      } else {
        notification.error({ message: "Investment Delete", description: "The investment was not deleted" });
      }
    } catch (error) {
      notification.error({ message: "Investment Deleted", description: "The investment was not deleted" });
    }
  };

  const handleInvestmentAction = (lineName, investmentId) => {
    const key = `${lineName}-${investmentId}`;
    setOpenSwipeId(null);
    setExpandedInvestments((prev) => {
      const newState = { [key]: !prev[key] };
      if (newState[key]) {
        setTimeout(() => {
          const element = document.getElementById(`investment-item-${investmentId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          }
        }, 100);
      }
      return newState;
    });
  };

  const handleSwipeStateChange = (investmentId, isOpen) => {
    if (isOpen) setOpenSwipeId(investmentId);
    else if (openSwipeId === investmentId) setOpenSwipeId(null);
  };

  const handleSearch = () => {
    // ── Line is mandatory — block search if not selected ──────────────────
    if (!selectedLine) {
      setLineError("Please select a line to search");
      return;
    }

    if (dateFilterType === "range" && (dateRange.from || dateRange.to)) {
      if (!validateDateRange(dateRange.from, dateRange.to)) {
        notification.error({ message: "Invalid Date Range", description: dateError });
        return;
      }
    }

    let filtered = [...originalData];

    // ── Filter by selected line ───────────────────────────────────────────
    filtered = filtered.filter(item =>
      (item.line_name || "Uncategorized") === selectedLine
    );

    // ── Save selected line to localStorage ────────────────────────────────
    const lineObj = lineList.find(l => l.line_name === selectedLine);
    if (lineObj) {
      localStorage.setItem("selected_line_id", lineObj.line_id);
      localStorage.setItem("selected_line_name", lineObj.line_name);
    }

    // ── Filter by date range ──────────────────────────────────────────────
    if (dateFilterType === "range" && dateRange.from && dateRange.to) {
      const fromDate = dayjs(dateRange.from).startOf('day');
      const toDate = dayjs(dateRange.to).endOf('day');
      filtered = filtered.filter(item => {
        const investmentDate = dayjs(item.created_time || item.investment_date);
        return investmentDate.isSameOrAfter(fromDate) && investmentDate.isSameOrBefore(toDate);
      });
    }

    // ── Filter by search text ─────────────────────────────────────────────
    if (searchText.trim()) {
      const query = searchText.trim().toLowerCase();
      filtered = filtered.filter(item =>
        (item.investment_title_name || "").toLowerCase().includes(query)
      );
    }

    const criteria = {
      line: selectedLine,
      dateType: dateFilterType,
      fromDate: dateRange.from ? formatDate(dateRange.from) : null,
      toDate: dateRange.to ? formatDate(dateRange.to) : null,
      searchText: searchText.trim() || null,
    };

    setSearchCriteria(criteria);
    setInvestments(filtered);
    const grouped = groupInvestmentsByLine(filtered);
    setGroupedData(grouped);
    Object.keys(grouped).forEach(lineName => {
      initializeLinePagination(lineName, grouped[lineName].length);
    });

    setSearchModalVisible(false);
    setShowReset(true);
    setHasSearched(true);

    if (filtered.length === 0) {
      notification.warning({ message: "No Results", description: "No investments found matching your search criteria." });
    } else {
      const expandedLinesObj = {};
      Object.keys(grouped).forEach(lineName => { expandedLinesObj[lineName] = true; });
      setExpandedLines(expandedLinesObj);
    }
  };

  const searchModal = (
    <Modal
      title={<div className="investment-list-modal-title">Search Investment</div>}
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
      <div className="investment-list-modal-content">

        {/* ── Line Single Select — Mandatory ── */}
        <div>
          <p className="investment-list-modal-label">
            Select Line: <span style={{ color: "#ff4d4f" }}>*</span>
          </p>
          <Select
            value={selectedLine}
            onChange={handleLineSelection}
            style={{ width: "100%" }}
            placeholder="Select a line"
            showSearch
            size="large"
            loading={lineLoader}
            status={lineError ? "error" : ""}
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {getUniqueLines().map((lineName) => (
              <Option key={lineName} value={lineName}>{lineName}</Option>
            ))}
          </Select>
          {lineError && (
            <p style={{ color: "#ff4d4f", fontSize: "12px", marginTop: "4px", marginBottom: 0 }}>
              {lineError}
            </p>
          )}
        </div>

        {/* ── Date Filter ── */}
        <div>
          <p className="investment-list-modal-label">Date Filter:</p>
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
            <div className="investment-list-date-filter-container">
              <p className="investment-list-date-filter-label">Select date range:</p>
              <div className="investment-list-date-range-container">
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
                  className="investment-list-date-input"
                />
                <span className="investment-list-date-separator">to</span>
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
                  className="investment-list-date-input"
                />
              </div>
              {dateError && (
                <p style={{ color: "#ff4d4f", fontSize: "12px", marginTop: "8px" }}>{dateError}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Investment Title Text Search ── */}
        <div>
          <p className="investment-list-modal-label">Investment Title:</p>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Enter investment title to search"
            className="investment-list-search-input"
            onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
        </div>
      </div>
    </Modal>
  );

  const handleEditInvestment = (investment) => navigate(`/investment/edit/${investment.id}`);

  return (
    <div className="investment-list-page-content">
      <div className="investment-list-header">
        <h2 className="investment-list-title">Investment List</h2>
        <div className="investment-list-actions">
          <Button icon={<SearchOutlined />} onClick={() => setSearchModalVisible(true)} type="default">
            {!isMobile && "Search Criteria"}
          </Button>
          {showReset && (
            <Button icon={<ReloadOutlined />} onClick={handleReset} title="Reset to Original" />
          )}
        </div>
      </div>

      {searchModal}
      {loading && <Loader />}
      {lineLoader && <Loader loadingText="Fetching line details..." />}

      {hasSearched && (
        <div id="scrollableDiv" className="investment-list-scrollable-div">
          {showReset && searchCriteria && (
            <>
              <Divider style={{ margin: '5px 0' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', padding: '8px 0' }}>
                {/* ── Line tag ── */}
                <Tag color="blue" style={{ margin: 0, padding: '4px 8px' }}>
                  Line: {searchCriteria.line}
                </Tag>

                {/* ── Date tag ── */}
                {searchCriteria.dateType === "range" && searchCriteria.fromDate && searchCriteria.toDate ? (
                  <Tag color="green" style={{ margin: 0, padding: '4px 8px' }}>
                    Date: {searchCriteria.fromDate} to {searchCriteria.toDate}
                  </Tag>
                ) : (
                  <Tag color="green" style={{ margin: 0, padding: '4px 8px' }}>Date: All</Tag>
                )}

                {/* ── Investment title tag ── */}
                <Tag color="purple" style={{ margin: 0, padding: '4px 8px' }}>
                  Investment = {searchCriteria.searchText ? `"${searchCriteria.searchText}"` : "All"}
                </Tag>
              </div>
              <Divider style={{ margin: '5px 0' }} />
            </>
          )}

          {Object.keys(groupedData).map((lineName) => (
            <div key={lineName} className="investment-list-line-group">
              <div className="investment-list-line-header">
                <div className="investment-list-line-title-container">
                  <Image preview={false} src={lineIcon} width={30} height={30} />
                  <span className="investment-list-line-title">{lineName}</span>
                </div>
                <div className={showReset ? "investment-list-badge investment-list-badge-search" : "investment-list-badge"}>
                  {groupedData[lineName].length}
                </div>
              </div>

              <div id={'scrollableDiv-' + lineName} className="investment-list-container">
                <InfiniteScroll
                  dataLength={investmentsPagination[lineName]?.displayed || INVESTMENTS_PAGE_SIZE}
                  next={() => loadMoreInvestments(lineName)}
                  hasMore={
                    (investmentsPagination[lineName]?.displayed || 0) <
                    (investmentsPagination[lineName]?.total || 0)
                  }
                  loader={
                    <div className="investment-list-skeleton">
                      <Skeleton avatar paragraph={{ rows: 1 }} active />
                    </div>
                  }
                  endMessage={
                    <Divider plain className="investment-list-divider">
                      <span className="investment-list-divider-star">★ </span>
                      <span className="investment-list-divider-text">
                        End of <span className="investment-list-divider-line-name">{lineName}</span> line{" "}
                        <span className="investment-list-divider-star">★</span>
                      </span>
                    </Divider>
                  }
                  scrollableTarget={'scrollableDiv-' + lineName}
                >
                  <List
                    dataSource={groupedData[lineName].slice(
                      0,
                      investmentsPagination[lineName]?.displayed || INVESTMENTS_PAGE_SIZE
                    )}
                    className="investment-list"
                    renderItem={(investment, index) => {
                      const isExpanded = expandedInvestments[lineName + '-' + investment.id];
                      const lineIndex = index + 1;

                      return (
                        <div
                          key={investment.id}
                          id={'investment-item-' + investment.id}
                          className="investment-list-item-wrapper"
                        >
                          {isMobile ? (
                            <SwipeablePanel
                              item={{ ...investment, lineIndex }}
                              index={investment.id}
                              titleKey="investment_title_name"
                              name="investment"
                              avatarSrc={lineIcon}
                              onSwipeRight={!isExpanded ? () => handleEditInvestment(investment) : undefined}
                              onSwipeLeft={!isExpanded ? () => handleDelete(investment) : undefined}
                              isExpanded={isExpanded}
                              onExpandToggle={() => handleInvestmentAction(lineName, investment.id)}
                              renderContent={() => isExpanded ? <InvestmentCollapseContent investment={investment} /> : null}
                              isSwipeOpen={openSwipeId === investment.id}
                              onSwipeStateChange={(isOpen) => handleSwipeStateChange(investment.id, isOpen)}
                            />
                          ) : (
                            <>
                              <List.Item
                                className={isExpanded ? "investment-list-item investment-list-item-expanded" : "investment-list-item"}
                              >
                                <List.Item.Meta
                                  avatar={
                                    <div className="investment-list-avatar-container">
                                      <span className="investment-list-index-badge">{lineIndex}</span>
                                    </div>
                                  }
                                  title={
                                    <div
                                      onClick={() => handleInvestmentAction(lineName, investment.id)}
                                      className="investment-list-item-title-container"
                                    >
                                      {/* Left: investment title */}
                                      <span className="investment-list-item-title">
                                        {investment.investment_title_name}
                                      </span>

                                      {/* Right: amount + date stacked, then ellipsis */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                          {investment.investment_amount !== undefined && investment.investment_amount !== null && (
                                            <span style={{ fontWeight: 600, color: '#1890ff', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                              ₹{investment.investment_amount}
                                            </span>
                                          )}
                                          {(investment.investment_date || investment.created_time) && (
                                            <span style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap' }}>
                                              {formatDate(investment.investment_date || investment.created_time)}
                                            </span>
                                          )}
                                        </div>

                                        <Dropdown
                                          overlay={
                                            <Menu>
                                              <Menu.Item
                                                key="edit"
                                                onClick={(e) => {
                                                  e.domEvent.stopPropagation();
                                                  handleEditInvestment(investment);
                                                }}
                                              >
                                                <div className="d-flex align-items-center gap-1">
                                                  <span className="mdi mdi-pencil text-secondary mb-0"></span>
                                                  <span>Edit</span>
                                                </div>
                                              </Menu.Item>
                                              <Menu.Item key="delete">
                                                <Popconfirm
                                                  title={`Delete investment ${investment.name || investment.investment_name || 'this investment'}?`}
                                                  description="Are you sure you want to delete this investment permanently?"
                                                  icon={<ExclamationCircleOutlined style={{ color: "red" }} />}
                                                  onConfirm={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(investment);
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
                                            className="investment-list-ellipsis-icon"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </Dropdown>
                                      </div>
                                    </div>
                                  }
                                />
                              </List.Item>

                              {isExpanded && (
                                <div className="investment-list-collapse-content">
                                  <InvestmentCollapseContent investment={investment} />
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
            <div className="investment-list-no-data">
              <p>No investments found matching your search criteria</p>
            </div>
          )}
        </div>
      )}

      {!hasSearched && !loading && (
        <div className="investment-list-no-search">
          <SearchOutlined className="investment-list-no-search-icon" />
          <p className="investment-list-no-search-title">No Search Performed</p>
          <p className="investment-list-no-search-text">Please use the Search button to filter and view investments.</p>
        </div>
      )}

      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        tooltip={<div>Add New Investment</div>}
        onClick={() => navigate("/investment/add")}
        className="investment-list-float-button"
      />
    </div>
  );
};

export default InvestmentList;