import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  notification,
  Grid,
  List,
  Avatar,
  Image,
  Dropdown,
  Menu,
  Modal,
  Divider,
  Skeleton,
  Select,
  Switch,
  Input,
  Popconfirm,
  Tag,
  Spin
} from "antd";
import { GET, DELETE, POST,PUT } from "helpers/api_helper";
import { CUSTOMERS } from "helpers/url_helper";
import Loader from "components/Common/Loader";
import SwipeablePanel from "components/Common/SwipeablePanel";
import Table from "components/Common/Table";
import {
  EllipsisOutlined,
  ReloadOutlined,
  PlusOutlined,
  SearchOutlined,
  DeleteFilled,
  ExclamationCircleOutlined,
  SwapOutlined
} from "@ant-design/icons";
import { FloatButton } from "antd";
import InfiniteScroll from "react-infinite-scroll-component";
import customerIcon from "../../../assets/icons/user.png";
import "./ViewCustomer.css";
import CustomerCollapseContent from "components/Common/CustomerCollapseContent";

const ViewCustomer = () => {
  const navigate = useNavigate();

  // ─── Customer data ──────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [tableLoader, setTableLoader] = useState(false);
  const [deleteLoader, setDeleteLoader] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState({});
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [customersPagination, setCustomersPagination] = useState({});

  // ─── Document state ─────────────────────────────────────────────────────────
  const [customerDocuments, setCustomerDocuments] = useState({});
  const [loadingDocuments, setLoadingDocuments] = useState({});

  // ─── Dropdown data ──────────────────────────────────────────────────────────
  const [lineDropdownList, setLineDropdownList] = useState([]);
  const [filteredAreaList, setFilteredAreaList] = useState([]);
  const [lineLoading, setLineLoading] = useState(false);
  const [areaLoading, setAreaLoading] = useState(false);

  // ─── Applied filter (committed after Apply) ─────────────────────────────────
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [selectedLineName, setSelectedLineName] = useState(null);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [selectedAreaName, setSelectedAreaName] = useState(null);

  // ─── Temp filter (inside the modal before Apply) ────────────────────────────
  const [tempLineId, setTempLineId] = useState(null);
  const [tempLineName, setTempLineName] = useState(null);
  const [tempAreaId, setTempAreaId] = useState(null);
  const [tempAreaName, setTempAreaName] = useState(null);

  // ─── Modal visibility ───────────────────────────────────────────────────────
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);

  // ─── Search state ───────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState("");
  const [showReset, setShowReset] = useState(false);
  // Keep a snapshot of unfiltered customers for the current area so search can be reset
  const [areaCustomers, setAreaCustomers] = useState([]);

  // ─── Reorder state ──────────────────────────────────────────────────────────
  const [reOrder, setReorder] = useState(false);
  const [rowReorderred, setRowReorderred] = useState(false);
  const [order, setOrder] = useState({});
  const [reorderLoader, setReorderLoader] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [reorderAreaName, setReorderAreaName] = useState(null);
  const [originalOrder, setOriginalOrder] = useState([]); // Track original order for diff

  const CUSTOMERS_PAGE_SIZE = 10;

  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // ────────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Clean up stale localStorage keys from old flow
    localStorage.removeItem("selected_line_name");
    localStorage.removeItem("selected_area_id");
    localStorage.removeItem("selected_area_name");

    fetchLineDropdown();
    setFilterModalVisible(true);
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 1 – Fetch lines
  // ────────────────────────────────────────────────────────────────────────────

  const fetchLineDropdown = async () => {
    try {
      setLineLoading(true);
      const response = await GET("api/line_dd");
      if (response?.status === 200) {
        const lines = Array.isArray(response.data) ? response.data : [];
        setLineDropdownList(lines);
        if (lines.length === 0) {
          notification.warning({
            message: "No Lines Available",
            description: "No lines have been assigned to you. Please contact your administrator.",
            duration: 5,
          });
        }
      } else if (response?.data?.detail === "No Line Exist" || response?.status === 404) {
        setLineDropdownList([]);
        notification.warning({
          message: "No Lines Found",
          description: "No lines have been assigned to you. Please contact your administrator.",
          duration: 5,
        });
      } else {
        setLineDropdownList([]);
        notification.error({ message: "Error", description: "Failed to fetch lines" });
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setLineDropdownList([]);
      if (detail === "No Line Exist") {
        notification.warning({
          message: "No Lines Found",
          description: "No lines have been assigned to you. Please contact your administrator.",
          duration: 5,
        });
      } else {
        notification.error({ message: "Error", description: "Failed to fetch lines" });
      }
    } finally {
      setLineLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 2 – Line selected → fetch areas
  // ────────────────────────────────────────────────────────────────────────────

  const handleLineChange = async (lineId) => {
    setTempLineId(lineId);
    setTempAreaId(null);
    setTempAreaName(null);
    setFilteredAreaList([]);

    const line = lineDropdownList.find((l) => l.line_id === lineId);
    setTempLineName(line?.line_name || null);

    if (!lineId) return;

    try {
      setAreaLoading(true);
      const response = await GET(`api/area_dd?line_id=${lineId}`);
      if (response?.status === 200) {
        setFilteredAreaList(response.data);
      } else {
        notification.error({ message: "Error", description: "Failed to fetch areas" });
        setFilteredAreaList([]);
      }
    } catch (error) {
      notification.error({ message: "Error", description: "Failed to fetch areas" });
      setFilteredAreaList([]);
    } finally {
      setAreaLoading(false);
    }
  };

  // Area selected in modal
  const handleAreaChange = (areaId) => {
    setTempAreaId(areaId);
    const area = filteredAreaList.find((a) => a.id === areaId);
    setTempAreaName(area?.areaName || null);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 3 – Apply filter → fetch customers
  // ────────────────────────────────────────────────────────────────────────────

  const handleApplyFilter = async () => {
    if (!tempLineId || !tempAreaId) {
      notification.warning({
        message: "Incomplete Selection",
        description: "Please select both Line and Area to proceed.",
      });
      return;
    }

    // Commit selections
    setSelectedLineId(tempLineId);
    setSelectedLineName(tempLineName);
    setSelectedAreaId(tempAreaId);
    setSelectedAreaName(tempAreaName);
    localStorage.setItem("selected_line_id", tempLineId);
  localStorage.setItem("selected_line_name", tempLineName);
  localStorage.setItem("selected_area_id", tempAreaId);
  localStorage.setItem("selected_area_name", tempAreaName);

    setFilterModalVisible(false);
    await fetchCustomerData(tempLineId, tempAreaId);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // FETCH CUSTOMERS  /api/customers/?line_id=X&area_id=Y
  // ────────────────────────────────────────────────────────────────────────────

  const fetchCustomerData = async (lineId, areaId) => {
    try {
      setTableLoader(true);
      setCustomers([]);
      setAreaCustomers([]);
      setGroupedData({});

      const response = await GET(`/api/customers/?line_id=${lineId}&area_id=${areaId}`);

      let customersData = [];

      if (response?.status === 200) {
        if (response.data?.detail) {
          console.log("No customers available:", response.data.detail);
          customersData = [];
        } else if (response.data?.results && Array.isArray(response.data.results)) {
          customersData = response.data.results;
        } else if (Array.isArray(response.data)) {
          customersData = response.data;
        } else {
          console.warn("Unexpected response structure:", response.data);
          customersData = [];
        }
      }

      setCustomers(customersData);
      setAreaCustomers(customersData); // snapshot for search reset

      const grouped = groupCustomersByArea(customersData);
      setGroupedData(grouped);
      Object.keys(grouped).forEach((areaName) => {
        initializeAreaPagination(areaName, grouped[areaName].length);
      });

      if (customersData.length === 0) {
        notification.warning({
          message: "No Customers Found",
          description: "No customers found for the selected Line and Area.",
        });
      }
    } catch (error) {
      console.error("Error fetching customers:", error);

      if (
        error.response?.data?.detail === "No Customer Exist" ||
        error.response?.data?.detail
      ) {
        setCustomers([]);
        setAreaCustomers([]);
        setGroupedData({});
      } else {
        notification.error({
          message: "Error",
          description: "Failed to fetch customer data",
        });
        setCustomers([]);
        setAreaCustomers([]);
        setGroupedData({});
      }
    } finally {
      setTableLoader(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RESET / CHANGE AREA
  // ────────────────────────────────────────────────────────────────────────────

  const handleReset = () => {
    // Clear applied selections
    setSelectedLineId(null);
    setSelectedLineName(null);
    setSelectedAreaId(null);
    setSelectedAreaName(null);

    // Clear modal temps
    setTempLineId(null);
    setTempLineName(null);
    setTempAreaId(null);
    setTempAreaName(null);
    setFilteredAreaList([]);
    localStorage.removeItem("selected_line_id");
localStorage.removeItem("selected_line_name");
localStorage.removeItem("selected_area_id");
localStorage.removeItem("selected_area_name");

    // Clear data & UI state
    setCustomers([]);
    setAreaCustomers([]);
    setGroupedData({});
    setCustomerDocuments({});
    setSearchText("");
    setShowReset(false);
    setReorder(false);
    setReorderAreaName(null);
    setOrder({});
    setRowReorderred(false);
    setIsDragMode(false);
    setOriginalOrder([]); // Clear original order

    setFilterModalVisible(true);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // GROUPING & PAGINATION HELPERS
  // ────────────────────────────────────────────────────────────────────────────

  const groupCustomersByArea = (data) => {
    const grouped = {};
    data.forEach((customer) => {
      const areaName = customer.area_name || selectedAreaName || `Area ${customer.area}` || "Uncategorized";
      if (!grouped[areaName]) grouped[areaName] = [];
      grouped[areaName].push(customer);
    });
    return grouped;
  };

  const initializeAreaPagination = (areaName, totalCustomers) => {
    setCustomersPagination((prev) => ({
      ...prev,
      [areaName]: {
        displayed: Math.min(CUSTOMERS_PAGE_SIZE, totalCustomers),
        total: totalCustomers,
      },
    }));
  };

  const loadMoreCustomers = (areaName) => {
    setCustomersPagination((prev) => {
      const current = prev[areaName] || { displayed: 0, total: 0 };
      return {
        ...prev,
        [areaName]: {
          ...current,
          displayed: Math.min(current.displayed + CUSTOMERS_PAGE_SIZE, current.total),
        },
      };
    });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SEARCH
  // ────────────────────────────────────────────────────────────────────────────

  const handleSearch = () => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      setSearchModalVisible(false);
      return;
    }

    const filtered = areaCustomers.filter((customer) =>
      customer.customer_name?.toLowerCase().includes(query)
    );

    const grouped = groupCustomersByArea(filtered);
    setGroupedData(grouped);
    Object.keys(grouped).forEach((areaName) => {
      initializeAreaPagination(areaName, grouped[areaName].length);
    });

    setSearchModalVisible(false);
    setShowReset(true);

    if (filtered.length === 0) {
      notification.warning({
        message: "No Results",
        description: `No matches found for "${searchText}".`,
      });
    }
  };

  const handleSearchReset = () => {
    const grouped = groupCustomersByArea(areaCustomers);
    setGroupedData(grouped);
    Object.keys(grouped).forEach((areaName) => {
      initializeAreaPagination(areaName, grouped[areaName].length);
    });
    setSearchText("");
    setShowReset(false);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // REORDER
  // ────────────────────────────────────────────────────────────────────────────

  const clickReorder = () => {
    if (!selectedAreaId) {
      notification.warning({ message: "No Area Selected", description: "Please select an area first." });
      return;
    }
    setReorderAreaName(selectedAreaName);
    setReorder(true);
    setIsDragMode(false);
    setOrder({});
    setRowReorderred(false);
    setShowReset(false);

    // Store original order with IDs and their positions
    setOriginalOrder(customers.map((item, index) => ({
      id: item.id,
      originalIndex: index,
    })));
  };

  const handleReOrder = (event, row) => {
    event.preventDefault();
    setRowReorderred(true);
    setOrder((prev) => ({ ...prev, [row.id]: event.target.value }));
  };

  const handleDragEnd = (data) => {
    setCustomers(data);
    setRowReorderred(true);
  };

  const sortData = (order) => {
    if (Object.keys(order).length > 0) {
      const reorderedData = [...customers];
      Object.keys(order).forEach((value) => {
        const index = reorderedData.findIndex((item) => item.id === parseInt(value));
        if (index !== -1) {
          const [movedItem] = reorderedData.splice(index, 1);
          reorderedData.splice(order[value] - 1, 0, movedItem);
        }
      });
      return reorderedData;
    }
    return customers;
  };

  // Get only the items whose position has changed
  const getReorderedItems = (currentData) => {
    const reorderedItems = [];

    currentData.forEach((item, newIndex) => {
      const originalItem = originalOrder.find((orig) => orig.id === item.id);

      if (originalItem && originalItem.originalIndex !== newIndex) {
        reorderedItems.push({
          id: item.id,
          newOrder: newIndex + 1,
          oldOrder: originalItem.originalIndex + 1,
        });
      }
    });

    return reorderedItems;
  };

  const submitReorder = async () => {
    try {
      setReorderLoader(true);

      // Get current order (either from drag-drop or manual reorder)
      const reorderedData = Object.keys(order)?.length > 0 ? sortData(order) : customers;

      // Get only the items that were reordered
      const reorderedItems = getReorderedItems(reorderedData);

      if (reorderedItems.length === 0) {
        notification.info({
          message: "No Changes",
          description: "No customers were reordered.",
        });
        setReorderLoader(false);
        return;
      }

      // Send only IDs of reordered items
      const payload = {
        ordered_ids: reorderedItems.map((item) => item.id),
      };

      const response = await PUT(`api/customers-reorder/`, payload);

      if (response?.status === 200) {
        setCustomers(reorderedData);
        setAreaCustomers(reorderedData);
        const grouped = groupCustomersByArea(reorderedData);
        setGroupedData(grouped);
        Object.keys(grouped).forEach((areaName) =>
          initializeAreaPagination(areaName, grouped[areaName].length)
        );

        setReorder(false);
        setReorderAreaName(null);
        setOrder({});
        setRowReorderred(false);
        setIsDragMode(false);
        setOriginalOrder([]); // Clear original order

        notification.success({
          message: "Re-Ordered",
          description: `Successfully reordered ${reorderedItems.length} customer(s).`,
          duration: 5,
        });
      } else {
        notification.error({ message: "Re-Order Failed", description: "Failed to update the order", duration: 5 });
      }
      setReorderLoader(false);
    } catch (e) {
      setReorderLoader(false);
      notification.error({ message: "Error", description: "Failed to update the order" });
    }
  };

  const handleCancelReorder = () => {
    setReorder(false);
    setReorderAreaName(null);
    setOrder({});
    setRowReorderred(false);
    setIsDragMode(false);
    setOriginalOrder([]); // Clear original order

    // Restore original area snapshot
    const grouped = groupCustomersByArea(areaCustomers);
    setCustomers(areaCustomers);
    setGroupedData(grouped);
    Object.keys(grouped).forEach((areaName) =>
      initializeAreaPagination(areaName, grouped[areaName].length)
    );
  };

  // ────────────────────────────────────────────────────────────────────────────
  // CUSTOMER ACTIONS
  // ────────────────────────────────────────────────────────────────────────────

  const fetchCustomerDocuments = async (customerId) => {
    if (customerDocuments[customerId]) return customerDocuments[customerId];

    setLoadingDocuments((prev) => ({ ...prev, [customerId]: true }));
    try {
      const response = await GET(`/api/customer-documents/customer/${customerId}/documents/`);
      let documents = [];
      if (response && Array.isArray(response.data)) documents = response.data;
      else if (response && Array.isArray(response)) documents = response;

      setCustomerDocuments((prev) => ({ ...prev, [customerId]: documents }));
      return documents;
    } catch (error) {
      setCustomerDocuments((prev) => ({ ...prev, [customerId]: [] }));
      if (!error.message?.includes("Customer not found")) {
        notification.error({ message: "Error", description: "Failed to fetch customer documents", duration: 5 });
      }
      return [];
    } finally {
      setLoadingDocuments((prev) => ({ ...prev, [customerId]: false }));
    }
  };

  const handleCustomerAction = async (areaName, customerId) => {
    const key = `${areaName}-${customerId}`;
    const wasExpanded = expandedAreas[key];

    setOpenSwipeId(null);
    setExpandedAreas((prev) => {
      const newState = { [key]: !prev[key] };
      if (newState[key] && !wasExpanded) {
        fetchCustomerDocuments(customerId);
        setTimeout(() => {
          const element = document.getElementById(`customer-item-${customerId}`);
          if (element) element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }, 100);
      }
      return newState;
    });
  };

  const handleSwipeStateChange = (customerId, isOpen) => {
    if (isOpen) setOpenSwipeId(customerId);
    else if (openSwipeId === customerId) setOpenSwipeId(null);
  };

  const handleEditCustomer = (customer) => navigate(`/customer/edit/${customer.id}`);

  const onDelete = async (record) => {
    try {
      setDeleteLoader(true);
      const response = await DELETE(`/api/customers/${record.id}/`);
      if (response?.status === 200) {
        const updatedData = customers.filter((item) => item.id !== record.id);
        const updatedArea = areaCustomers.filter((item) => item.id !== record.id);
        setCustomers(updatedData);
        setAreaCustomers(updatedArea);
        setGroupedData(groupCustomersByArea(updatedData));
        setCustomerDocuments((prev) => { const u = { ...prev }; delete u[record.id]; return u; });

        notification.success({
          message: `Customer ${record?.customer_id} Deleted!`,
          description: "The customer has been deleted successfully",
          duration: 5,
        });
      } else {
        notification.error({ message: "Customer Delete", description: "The customer was not deleted", duration: 5 });
      }
      setDeleteLoader(false);
    } catch (error) {
      setDeleteLoader(false);
      notification.error({ message: "Customer Delete", description: "The customer was not deleted", duration: 5 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // MODALS JSX
  // ────────────────────────────────────────────────────────────────────────────

  const filterModal = (
    <Modal
      title={<div style={{ textAlign: "center" }}>Select Line & Area</div>}
      open={filterModalVisible}
      onCancel={() => {
        if (selectedLineId && selectedAreaId) {
          setFilterModalVisible(false);
        } else {
          notification.warning({
            message: "Selection Required",
            description: "Please select both Line and Area to view customers.",
          });
        }
      }}
      closable={!!(selectedLineId && selectedAreaId)}
      footer={[
        <Button
          key="clear"
          onClick={() => {
            setTempLineId(null);
            setTempLineName(null);
            setTempAreaId(null);
            setTempAreaName(null);
            setFilteredAreaList([]);
          }}
        >
          Clear
        </Button>,
        <Button
          key="apply"
          type="primary"
          disabled={!tempLineId || !tempAreaId}
          onClick={handleApplyFilter}
          loading={tableLoader}
        >
          Apply
        </Button>,
      ]}
    >
      {/* Line select */}
      <div style={{ marginBottom: "15px" }}>
        <label style={{ fontWeight: "400", display: "block", marginBottom: "5px" }}>
          Select Line Name
        </label>
        <Select
  placeholder={lineLoading ? "Loading lines..." : "Select a line"}
  style={{ width: "100%" }}
  onChange={handleLineChange}
  value={tempLineId}
  disabled={lineLoading}
  showSearch
  suffixIcon={lineLoading ? <Spin size="small" /> : undefined}
  filterOption={(input, option) =>
    (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
  }
>
  {lineDropdownList.map((line) => (
    <Select.Option key={line.line_id} value={line.line_id}>
      {line.line_name}
    </Select.Option>
  ))}
</Select>
      </div>

      {/* Area select */}
      <div style={{ marginBottom: "15px" }}>
        <label style={{ fontWeight: "400", display: "block", marginBottom: "5px" }}>
          Select Area Name
        </label>
       <Select
  placeholder={
    !tempLineId
      ? "Select a line first"
      : areaLoading
      ? "Loading areas..."
      : "Select an area"
  }
  style={{ width: "100%" }}
  onChange={handleAreaChange}
  value={tempAreaId}
  disabled={!tempLineId || areaLoading}
  showSearch
  suffixIcon={areaLoading ? <Spin size="small" /> : undefined}
  filterOption={(input, option) =>
    (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
  }
>
  {filteredAreaList.map((area) => (
    <Select.Option key={area.id} value={area.id}>
      {area.areaName}
    </Select.Option>
  ))}
</Select>
      </div>
    </Modal>
  );

  const searchModal = (
    <Modal
      title={<div style={{ textAlign: "center" }}>Search Customer</div>}
      open={searchModalVisible}
      onOk={handleSearch}
      onCancel={() => setSearchModalVisible(false)}
      okText="Search"
    >
      <div style={{ marginBottom: "15px" }}>
        <label style={{ fontWeight: "400", display: "block", marginBottom: "5px" }}>
          Enter Customer Name
        </label>
        <Input
          id="search-input"
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onPressEnter={handleSearch}
          placeholder="Enter customer name to search"
          size="large"
          style={{ width: "100%" }}
        />
      </div>
    </Modal>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="view-customer-page-content">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="view-customer-header-container"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <div className="view-customer-header-left">
          {reOrder ? (
            <div>
              <h2 className="view-customer-title">Reorder Customers</h2>
              <div style={{ marginTop: "8px" }}>
                <span style={{ marginRight: "8px", color: "#666" }}>Selected Area:</span>
                <Tag color="blue" style={{ fontSize: "14px", padding: "4px 12px" }}>
                  {reorderAreaName}
                </Tag>
              </div>
            </div>
          ) : (
            <h2 className="view-customer-title">Customer List</h2>
          )}
        </div>

        <div className="view-customer-actions">
          {reOrder ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "5px" }}>
              <span className="view-customer-switch-label">Slide</span>
              <Switch checked={isDragMode} onChange={(checked) => setIsDragMode(checked)} />
            </div>
          ) : (
            <>
              <Button
                icon={<SwapOutlined rotate={90} />}
                onClick={clickReorder}
                disabled={reOrder || tableLoader || !selectedAreaId || showReset}
                className="view-customer-reorder-button"
                title="Reorder Customers"
              >
                {!isMobile && "Reorder"}
              </Button>
              <Button
                icon={<SearchOutlined />}
                onClick={() => setSearchModalVisible(true)}
                type="default"
                disabled={!selectedAreaId || tableLoader}
              >
                {!isMobile && "Search Customer"}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                title="Change Area"
                disabled={reOrder || tableLoader}
              >
                {!isMobile && "Change Area"}
              </Button>
            </>
          )}
        </div>
      </div>

      {filterModal}
      {searchModal}

      {tableLoader && <Loader />}

      {/* ── Reorder Table View ─────────────────────────────────────────────── */}
      {reOrder ? (
        <div>
          <Table
            data={customers}
            reOrder={isDragMode}
            Header={
              isDragMode
                ? [
                    { label: "S.No", value: "index" },
                    { label: "Customer Name", value: "customer_name" },
                    { label: "Move", value: "move" },
                  ]
                : [
                    { label: "S.No", value: "index" },
                    { label: "Reorder", value: "order" },
                    { label: "Customer Name", value: "customer_name" },
                  ]
            }
            handleDragEnd={isDragMode ? handleDragEnd : undefined}
            handleReOrder={!isDragMode ? handleReOrder : undefined}
            deleteLoader={deleteLoader}
            name="customer"
          />
          <div className="view-customer-table-actions">
            <Button
              type="primary"
              onClick={submitReorder}
              loading={reorderLoader}
              disabled={reorderLoader}
            >
              Submit
            </Button>
            <Button onClick={handleCancelReorder}>Cancel</Button>
          </div>
        </div>
      ) : (
        /* ── Customer List View ──────────────────────────────────────────── */
        <div id="scrollableDiv" className="view-customer-scrollable-div">

          {/* Filter info chips */}
          {selectedLineName && selectedAreaName && (
            <>
              <Divider style={{ margin: "5px 0" }} />
              <div className="view-customer-filter-info">
                <Tag className="view-customer-filter-label" color="blue">
                  Line: {selectedLineName}
                </Tag>
                <Tag className="view-customer-filter-label" color="green">
                  Area: {selectedAreaName}
                </Tag>

                {showReset && searchText && (
                  <>
                    <Tag className="view-customer-filter-label" color="purple">
                      Name = "{searchText}"
                    </Tag>
                    <Button
                      type="link"
                      size="small"
                      onClick={handleSearchReset}
                      style={{ padding: "0 8px", height: "auto", fontSize: "12px" }}
                    >
                      ✕
                    </Button>
                  </>
                )}
              </div>
              <Divider style={{ margin: "5px 0" }} />
            </>
          )}

          {/* Area groups */}
          {Object.keys(groupedData).map((areaName) => (
            <div key={areaName} className="view-customer-area-group">
              <div className="view-customer-area-header">
                <div className="view-customer-area-title-container">
                  <Image preview={false} src={customerIcon} width={30} height={30} />
                  <span className="view-customer-area-title">{areaName}</span>
                </div>
                <div className="view-customer-badge">{groupedData[areaName].length}</div>
              </div>

              <div id={"scrollableDiv-" + areaName} className="view-customer-list-container">
                <InfiniteScroll
                  dataLength={customersPagination[areaName]?.displayed || CUSTOMERS_PAGE_SIZE}
                  next={() => loadMoreCustomers(areaName)}
                  hasMore={
                    (customersPagination[areaName]?.displayed || 0) <
                    (customersPagination[areaName]?.total || 0)
                  }
                  loader={
                    <div className="view-customer-skeleton-container">
                      <Skeleton avatar paragraph={{ rows: 1 }} active />
                    </div>
                  }
                  endMessage={
                    <Divider plain className="view-customer-divider-container">
                      <span className="view-customer-divider-star">★ </span>
                      <span className="view-customer-divider-text">
                        End of{" "}
                        <span className="view-customer-divider-area-name">{areaName}</span>{" "}
                        customers{" "}
                        <span className="view-customer-divider-star">★</span>
                      </span>
                    </Divider>
                  }
                  scrollableTarget={"scrollableDiv-" + areaName}
                >
                  <List
                    dataSource={groupedData[areaName].slice(
                      0,
                      customersPagination[areaName]?.displayed || CUSTOMERS_PAGE_SIZE
                    )}
                    className="view-customer-list"
                    renderItem={(customer, index) => {
                      const isExpanded = expandedAreas[areaName + "-" + customer.id];
                      const lineIndex = index + 1;
                      const documents = customerDocuments[customer.id] || [];
                      const isLoadingDocs = loadingDocuments[customer.id] || false;

                      return (
                        <div
                          key={customer.id}
                          id={"customer-item-" + customer.id}
                          className="view-customer-list-item-wrapper"
                        >
                          {isMobile ? (
                            <SwipeablePanel
                              item={{ ...customer, lineIndex }}
                              index={customer.id}
                              titleKey="customer_name"
                              subtitleKey="customer_id"
                              name="customer"
                              avatarSrc={customerIcon}
                              onSwipeRight={!isExpanded ? () => handleEditCustomer(customer) : undefined}
                              onSwipeLeft={!isExpanded ? () => onDelete(customer) : undefined}
                              isExpanded={isExpanded}
                              onExpandToggle={() => handleCustomerAction(areaName, customer.id)}
                              renderContent={() =>
                                isExpanded ? (
                                  <CustomerCollapseContent
                                    customer={customer}
                                    documents={documents}
                                    isLoadingDocuments={isLoadingDocs}
                                  />
                                ) : null
                              }
                              isSwipeOpen={openSwipeId === customer.id}
                              onSwipeStateChange={(isOpen) => handleSwipeStateChange(customer.id, isOpen)}
                            />
                          ) : (
                            <>
                              <List.Item
                                className={
                                  isExpanded
                                    ? "view-customer-list-item view-customer-list-item-expanded"
                                    : "view-customer-list-item"
                                }
                              >
                                <List.Item.Meta
                                  avatar={
                                    <div className="view-customer-avatar-container">
                                      <span className="view-customer-index-badge">{lineIndex}</span>
                                    </div>
                                  }
                                  title={
                                    <div
                                      onClick={() => handleCustomerAction(areaName, customer.id)}
                                      className="view-customer-item-title-container"
                                    >
                                      <div>
                                        <div className="view-customer-item-title">{customer.customer_name}</div>
                                        <div className="view-customer-item-subtitle">ID: {customer.customer_id}</div>
                                      </div>
                                      <Dropdown
                                        overlay={
                                          <Menu>
                                            <Menu.Item
                                              key="edit"
                                              onClick={(e) => {
                                                e.domEvent.stopPropagation();
                                                handleEditCustomer(customer);
                                              }}
                                            >
                                              <div className="d-flex align-items-center gap-1">
                                                <span className="mdi mdi-pencil text-secondary mb-0"></span>
                                                <span>Edit</span>
                                              </div>
                                            </Menu.Item>
                                            <Menu.Item key="delete">
                                              <Popconfirm
                                                title={`Delete customer ${customer.customer_name || "this customer"}?`}
                                                description="Are you sure you want to delete this customer permanently?"
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
                                                <div
                                                  className="d-flex align-items-center gap-1"
                                                  style={{ color: "red" }}
                                                >
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
                                          className="view-customer-ellipsis-icon"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </Dropdown>
                                    </div>
                                  }
                                />
                              </List.Item>

                              {isExpanded && (
                                <div className="view-customer-collapse-content">
                                  <CustomerCollapseContent
                                    customer={customer}
                                    documents={documents}
                                    isLoadingDocuments={isLoadingDocs}
                                  />
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

          {/* Empty state */}
          {Object.keys(groupedData).length === 0 && !tableLoader && selectedLineId && selectedAreaId && (
            <div className="view-customer-no-data">
              <p>
                {showReset && searchText
                  ? `No customers found matching "${searchText}" in the selected area`
                  : "No customers found for the selected area"}
              </p>
            </div>
          )}
        </div>
      )}

      {!reOrder && (
        <FloatButton
          icon={<PlusOutlined />}
          type="primary"
          tooltip={<div>Add New Customer</div>}
          onClick={() => navigate("/add-customer")}
          className="view-customer-float-button"
        />
      )}
    </div>
  );
};

export default ViewCustomer;