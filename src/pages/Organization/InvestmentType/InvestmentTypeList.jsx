import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  notification,
  Grid,
  List,
  Image,
  Dropdown,
  Menu,
  Modal,
  Divider,
  Skeleton,
  FloatButton,
  Select,
  Popconfirm,
  Tag,
  Spin,
  Switch,
  Input
} from "antd";
import { DELETE, GET } from "helpers/api_helper";
import Loader from "components/Common/Loader";
import SwipeablePanel from "components/Common/SwipeablePanel";
import {
  EllipsisOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteFilled,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import lineIcon from "../../../assets/icons/profits (1).png";
import InvestmentTypeCollapseContent from "components/Common/InvestmentTypeCollapseContent";
import "./InvestmentTypeList.css";

const INVESTMENT_TYPE_API = "/api/investmenttypes/";

const InvestmentTypeList = () => {
  const navigate = useNavigate();

  // ─── Data ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [allTypes, setAllTypes] = useState([]);       // raw full list
  const [groupedData, setGroupedData] = useState({});  // grouped by line_name
  const [investmentTypesPagination, setInvestmentTypesPagination] = useState({});

  // ─── UI ────────────────────────────────────────────────────────────────────
  const [expandedTypes, setExpandedTypes] = useState({});
  const [openSwipeId, setOpenSwipeId] = useState(null);

  // ─── Search / filter modal ─────────────────────────────────────────────────
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [lineDropdownList, setLineDropdownList] = useState([]);
  const [lineLoading, setLineLoading] = useState(false);
  const [lineDropdownOpen, setLineDropdownOpen] = useState(false);
  const [selectedLines, setSelectedLines] = useState([]);
  const [multiUserFilter, setMultiUserFilter] = useState("all"); // "all" | "yes" | "no"
  const [searchCriteria, setSearchCriteria] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [investmentTitleSearch, setInvestmentTitleSearch] = useState("");

  const ITEMS_PAGE_SIZE = 10;
  const ALL_LINES_VALUE = "__ALL_LINES__";

  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // ────────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-open search modal on first load once data is ready
  useEffect(() => {
    if (!loading && allTypes.length > 0 && !hasSearched) {
      setSearchModalVisible(true);
    }
  }, [loading, allTypes]);

  // ────────────────────────────────────────────────────────────────────────────
  // FETCH
  // ────────────────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    setLoading(true);
    try {
      const storedBranchId = localStorage.getItem("selected_branch_id");
      if (!storedBranchId) {
        notification.warning({ message: "Branch Not Selected", description: "Please select a branch first." });
        setLoading(false);
        return;
      }

      let branchId;
      try { branchId = JSON.parse(storedBranchId); } catch { branchId = storedBranchId; }

      // Fetch investment types + line dropdown in parallel
      const [typesRes, linesRes] = await Promise.all([
        GET(INVESTMENT_TYPE_API),
        GET(`api/line_dd/?branch_id=${branchId}`),
      ]);

      if (typesRes?.status === 200) {
        const data = typesRes.data?.results || typesRes.data || [];
        setAllTypes(data);
      } else {
        setAllTypes([]);
      }

      if (linesRes?.status === 200) {
        setLineDropdownList(linesRes.data || []);
      } else {
        setLineDropdownList([]);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      notification.error({ message: "Error", description: "Failed to load investment types." });
      setAllTypes([]);
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // GROUP & PAGINATE
  // ────────────────────────────────────────────────────────────────────────────

  const groupByLine = (data) => {
    const grouped = {};
    data.forEach((item) => {
      const lineName = item.line_name || "Uncategorized";
      if (!grouped[lineName]) grouped[lineName] = [];
      grouped[lineName].push(item);
    });
    return grouped;
  };

  const initializeLinePagination = (lineName, total) => {
    setInvestmentTypesPagination((prev) => ({
      ...prev,
      [lineName]: {
        displayed: Math.min(ITEMS_PAGE_SIZE, total),
        total,
      },
    }));
  };

  const loadMoreItems = (lineName) => {
    setInvestmentTypesPagination((prev) => {
      const current = prev[lineName] || { displayed: 0, total: 0 };
      return {
        ...prev,
        [lineName]: {
          ...current,
          displayed: Math.min(current.displayed + ITEMS_PAGE_SIZE, current.total),
        },
      };
    });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SEARCH / FILTER
  // ────────────────────────────────────────────────────────────────────────────

  const getUniqueLines = () => {
    if (lineDropdownList.length > 0) {
      return [...new Set(lineDropdownList.map((l) => l.line_name))].filter(Boolean).sort();
    }
    return [...new Set(allTypes.map((t) => t.line_name || "Uncategorized"))].sort();
  };

  const handleLineSelection = (values) => {
    if (values.includes(ALL_LINES_VALUE)) {
      setSelectedLines([ALL_LINES_VALUE]);
    } else {
      setSelectedLines(values);
    }
  };

  const handleSearch = () => {
  const isAllLines = selectedLines.includes(ALL_LINES_VALUE) || selectedLines.length === 0;

  let filtered = [...allTypes];

  if (!isAllLines && selectedLines.length > 0) {
    filtered = filtered.filter((t) => selectedLines.includes(t.line_name || "Uncategorized"));
  }

  if (multiUserFilter === "yes") {
    filtered = filtered.filter((t) => t.multi_user_allocation === true);
  } else if (multiUserFilter === "no") {
    filtered = filtered.filter((t) => t.multi_user_allocation === false);
  }

  // ← new: filter by investment title
  if (investmentTitleSearch.trim()) {
    const query = investmentTitleSearch.trim().toLowerCase();
    filtered = filtered.filter((t) =>
      t.investment_title?.toLowerCase().includes(query)
    );
  }

  const criteria = {
    lines: isAllLines ? ["All Lines"] : selectedLines,
    multiUser: multiUserFilter,
    investmentTitle: investmentTitleSearch.trim() || null,  // ← new
  };

  setSearchCriteria(criteria);

  const grouped = groupByLine(filtered);
  setGroupedData(grouped);
  Object.keys(grouped).forEach((ln) => initializeLinePagination(ln, grouped[ln].length));

  setSearchModalVisible(false);
  setShowReset(true);
  setHasSearched(true);

  if (filtered.length === 0) {
    notification.warning({ message: "No Results", description: "No investment types match the selected filters." });
  }
};
  const handleReset = () => {
    setGroupedData({});
    setInvestmentTypesPagination({});
    setSelectedLines([]);
    setInvestmentTitleSearch("");
    setMultiUserFilter("all");
    setSearchCriteria(null);
    setShowReset(false);
    setHasSearched(false);
    setTimeout(() => setSearchModalVisible(true), 200);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // ITEM ACTIONS
  // ────────────────────────────────────────────────────────────────────────────

  const handleItemAction = (lineName, itemId) => {
    const key = `${lineName}-${itemId}`;
    setOpenSwipeId(null);
    setExpandedTypes((prev) => {
      const newState = { [key]: !prev[key] };
      if (newState[key]) {
        setTimeout(() => {
          const el = document.getElementById(`inv-type-item-${itemId}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
      return newState;
    });
  };

  const handleSwipeStateChange = (id, isOpen) => {
    if (isOpen) setOpenSwipeId(id);
    else if (openSwipeId === id) setOpenSwipeId(null);
  };

  const handleEdit = (item) => navigate(`/investment-type/edit/${item.id}`);

  const handleDelete = async (record) => {
    try {
      const response = await DELETE(`${INVESTMENT_TYPE_API}${record.id}/`);
      if (response?.status === 204 || response?.status === 200) {
        const updated = allTypes.filter((t) => t.id !== record.id);
        setAllTypes(updated);

        // Re-apply current filter
        const isAllLines = selectedLines.includes(ALL_LINES_VALUE) || selectedLines.length === 0;
        let filtered = [...updated];
        if (!isAllLines && selectedLines.length > 0) {
          filtered = filtered.filter((t) => selectedLines.includes(t.line_name || "Uncategorized"));
        }
        if (multiUserFilter === "yes") filtered = filtered.filter((t) => t.multi_user_allocation === true);
        if (multiUserFilter === "no") filtered = filtered.filter((t) => t.multi_user_allocation === false);

        const grouped = groupByLine(filtered);
        setGroupedData(grouped);
        Object.keys(grouped).forEach((ln) => initializeLinePagination(ln, grouped[ln].length));

        notification.success({
          message: `${record.investment_title.toUpperCase()} Deleted!`,
          description: "Investment type deleted successfully.",
        });
      } else {
        const errMsg = response?.data?.detail || "Failed to delete investment type.";
        notification.error({ message: "Delete Failed", description: errMsg });
      }
    } catch (error) {
      const errMsg = error?.response?.data?.detail || "An error occurred during deletion.";
      notification.error({ message: "Delete Failed", description: errMsg });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SEARCH MODAL
  // ────────────────────────────────────────────────────────────────────────────

  const searchModal = (
    <Modal
      title={<div className="inv-type-list-modal-title">Filter Investment Types</div>}
      open={searchModalVisible}
      onOk={handleSearch}
      onCancel={hasSearched ? () => setSearchModalVisible(false) : undefined}
      okText="Apply"
      cancelText="Cancel"
      cancelButtonProps={{ style: hasSearched ? {} : { display: "none" } }}
      closable={hasSearched}
      maskClosable={hasSearched}
      width={500}
    >
      <div className="inv-type-list-modal-content">

        {/* Line filter */}
        <div>
          <p className="inv-type-list-modal-label">Select Line:</p>
          <Select
            mode="multiple"
            value={selectedLines}
            onChange={handleLineSelection}
            style={{ width: "100%" }}
            placeholder="Select line(s)"
            allowClear
            maxTagCount="responsive"
            loading={lineLoading}
            open={lineDropdownOpen}
            onDropdownVisibleChange={(open) => setLineDropdownOpen(open)}
            dropdownRender={(menu) => (
              <>
                {menu}
                <div style={{ padding: "4px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "center" }}>
                  <Button
                    style={{ background: "#28a544", color: "white" }}
                    size="small"
                    onClick={() => setLineDropdownOpen(false)}
                  >
                    Select Done ✓
                  </Button>
                </div>
              </>
            )}
          >
            <Select.Option key={ALL_LINES_VALUE} value={ALL_LINES_VALUE}>All Lines</Select.Option>
            {getUniqueLines().map((ln) => (
              <Select.Option key={ln} value={ln}>{ln}</Select.Option>
            ))}
          </Select>
        </div>

        {/* Multi-user filter */}
        <div>
          <p className="inv-type-list-modal-label">Multi-User Allocation:</p>
          <Select
            value={multiUserFilter}
            onChange={setMultiUserFilter}
            style={{ width: "100%" }}
            size="large"
          >
            <Select.Option value="all">All</Select.Option>
            <Select.Option value="yes">Yes (Multi-User)</Select.Option>
            <Select.Option value="no">No (Single User)</Select.Option>
          </Select>
        </div>
        <div>
  <p className="inv-type-list-modal-label">Investment Title:</p>
  <Input
    placeholder="Search by investment title"
    value={investmentTitleSearch}
    onChange={(e) => setInvestmentTitleSearch(e.target.value)}
    allowClear
    size="large"
    // prefix={<SearchOutlined />}
  />
</div>

      </div>
    </Modal>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="inv-type-list-page-content">
      {/* Header */}
      <div className="inv-type-list-header">
        <h2 className="inv-type-list-title">Investment Type List</h2>
        <div className="inv-type-list-actions">
          <Button
            icon={<SearchOutlined />}
            onClick={() => setSearchModalVisible(true)}
            type="default"
          >
            {!isMobile && "Filter"}
          </Button>
          {showReset && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              title="Reset Filters"
            />
          )}
        </div>
      </div>

      {searchModal}
      {loading && <Loader />}

      {/* Active filter chips */}
      {hasSearched && showReset && searchCriteria && (
        <>
          <Divider style={{ margin: "5px 0" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "8px 0" }}>
            {searchCriteria.lines && (
              <Tag color="blue" style={{ margin: 0, padding: "4px 8px" }}>
                Line: {searchCriteria.lines.join(", ")}
              </Tag>
            )}
            <Tag color="green" style={{ margin: 0, padding: "4px 8px" }}>
              Multi-User:{" "}
              {searchCriteria.multiUser === "all"
                ? "All"
                : searchCriteria.multiUser === "yes"
                ? "Yes"
                : "No"}
            </Tag>
            {searchCriteria.investmentTitle && (
  <Tag color="purple" style={{ margin: 0, padding: "4px 8px" }}>
    Investment Title: {searchCriteria.investmentTitle}
  </Tag>
)}
          </div>
          <Divider style={{ margin: "5px 0" }} />
        </>
      )}

      {/* List */}
      {hasSearched && (
        <div id="scrollableDiv" className="inv-type-list-scrollable-div">

          {Object.keys(groupedData).map((lineName) => (
            <div key={lineName} className="inv-type-list-line-group">

              {/* Line header */}
              <div className="inv-type-list-line-header">
                <div className="inv-type-list-line-title-container">
                  <Image preview={false} src={lineIcon} width={30} height={30} />
                  <span className="inv-type-list-line-title">{lineName}</span>
                </div>
                <div className="inv-type-list-badge">{groupedData[lineName].length}</div>
              </div>

              {/* Infinite scroll per line */}
              <div id={`scrollableDiv-${lineName}`} className="inv-type-list-container">
                <InfiniteScroll
                  dataLength={investmentTypesPagination[lineName]?.displayed || ITEMS_PAGE_SIZE}
                  next={() => loadMoreItems(lineName)}
                  hasMore={
                    (investmentTypesPagination[lineName]?.displayed || 0) <
                    (investmentTypesPagination[lineName]?.total || 0)
                  }
                  loader={
                    <div className="inv-type-list-skeleton">
                      <Skeleton avatar paragraph={{ rows: 1 }} active />
                    </div>
                  }
                  endMessage={
                    <Divider plain className="inv-type-list-divider">
                      <span className="inv-type-list-divider-star">★ </span>
                      <span className="inv-type-list-divider-text">
                        End of{" "}
                        <span className="inv-type-list-divider-line-name">{lineName}</span> line{" "}
                        <span className="inv-type-list-divider-star">★</span>
                      </span>
                    </Divider>
                  }
                  scrollableTarget={`scrollableDiv-${lineName}`}
                >
                  <List
                    dataSource={groupedData[lineName].slice(
                      0,
                      investmentTypesPagination[lineName]?.displayed || ITEMS_PAGE_SIZE
                    )}
                    className="inv-type-list"
                    renderItem={(item, index) => {
                      const isExpanded = expandedTypes[`${lineName}-${item.id}`];
                      const lineIndex = index + 1;

                      return (
                        <div
                          key={item.id}
                          id={`inv-type-item-${item.id}`}
                          className="inv-type-list-item-wrapper"
                        >
                          {isMobile ? (
                            <SwipeablePanel
                              item={{ ...item, lineIndex }}
                              index={item.id}
                              titleKey="investment_title"
                              name="investment-type"
                              avatarSrc={lineIcon}
                              onSwipeRight={!isExpanded ? () => handleEdit(item) : undefined}
                              onSwipeLeft={!isExpanded ? () => handleDelete(item) : undefined}
                              isExpanded={isExpanded}
                              onExpandToggle={() => handleItemAction(lineName, item.id)}
                              renderContent={() =>
                                isExpanded ? (
                                  <InvestmentTypeCollapseContent investmentType={item} />
                                ) : null
                              }
                              isSwipeOpen={openSwipeId === item.id}
                              onSwipeStateChange={(isOpen) => handleSwipeStateChange(item.id, isOpen)}
                            />
                          ) : (
                            <>
                              <List.Item
                                className={
                                  isExpanded
                                    ? "inv-type-list-item inv-type-list-item-expanded"
                                    : "inv-type-list-item"
                                }
                              >
                                <List.Item.Meta
                                  avatar={
                                    <div className="inv-type-list-avatar-container">
                                      <span className="inv-type-list-index-badge">{lineIndex}</span>
                                    </div>
                                  }
                                  title={
                                    <div
                                      onClick={() => handleItemAction(lineName, item.id)}
                                      className="inv-type-list-item-title-container"
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <span className="inv-type-list-item-title">
                                          {item.investment_title}
                                        </span>
                                        <Tag
                                          color={item.multi_user_allocation ? "blue" : "orange"}
                                          style={{ fontSize: "12px" }}
                                        >
                                          {item.multi_user_allocation ? "Multi-User" : "Single User"}
                                        </Tag>
                                      </div>
                                      <Dropdown
                                        overlay={
                                          <Menu>
                                            <Menu.Item
                                              key="edit"
                                              onClick={(e) => {
                                                e.domEvent.stopPropagation();
                                                handleEdit(item);
                                              }}
                                            >
                                              <div className="d-flex align-items-center gap-1">
                                                <span className="mdi mdi-pencil text-secondary mb-0"></span>
                                                <span>Edit</span>
                                              </div>
                                            </Menu.Item>
                                            <Menu.Item key="delete">
                                              <Popconfirm
                                                title={`Delete "${item.investment_title}"?`}
                                                description="Are you sure you want to delete this investment type permanently?"
                                                icon={<ExclamationCircleOutlined style={{ color: "red" }} />}
                                                onConfirm={(e) => {
                                                  e.stopPropagation();
                                                  handleDelete(item);
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
                                          className="inv-type-list-ellipsis-icon"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </Dropdown>
                                    </div>
                                  }
                                />
                              </List.Item>

                              {isExpanded && (
                                <div className="inv-type-list-collapse-content">
                                  <InvestmentTypeCollapseContent investmentType={item} />
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
            <div className="inv-type-list-no-data">
              <p>No investment types found matching your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state before first search */}
      {!hasSearched && !loading && (
        <div className="inv-type-list-no-search">
          <SearchOutlined className="inv-type-list-no-search-icon" />
          <p className="inv-type-list-no-search-title">No Filter Applied</p>
          <p className="inv-type-list-no-search-text">
            Please use the Filter button to view investment types.
          </p>
        </div>
      )}

      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        tooltip={<div>Add New Investment Type</div>}
        onClick={() => navigate("/investment-type/add")}
        className="inv-type-list-float-button"
      />
    </div>
  );
};

export default InvestmentTypeList;
