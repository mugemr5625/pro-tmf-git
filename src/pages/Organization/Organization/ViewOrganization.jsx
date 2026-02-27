import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button, notification, Grid, List, Image, Dropdown, Menu,
  Modal, Tag, Divider, Skeleton, Popconfirm,
} from "antd";
import { GET, DELETE } from "helpers/api_helper";
import Loader from "components/Common/Loader";
import SwipeablePanel from "components/Common/SwipeablePanel";
import {
  EllipsisOutlined, SearchOutlined, ReloadOutlined,
  PlusOutlined, DeleteFilled, ExclamationCircleOutlined,
} from "@ant-design/icons";
import OrganizationCollapseContent from "components/Common/OrganizationCollapseContent";
import { FloatButton } from "antd";
import InfiniteScroll from "react-infinite-scroll-component";
import "./ViewOrganization.css";

const ORGANIZATION_API          = "/api/organization/";
const ORGANIZATION_DOCUMENTS_API = "/api/organization-documents/";
const PAGE_SIZE        = 10;
const MAX_VISIBLE_ITEMS = 8;
const ITEM_HEIGHT       = 20;

const ViewOrganization = () => {
  const navigate = useNavigate();
  const [tableData,    setTableData]    = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [tableLoader,  setTableLoader]  = useState(false);
  const [deleteLoader, setDeleteLoader] = useState(false);

  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchText,         setSearchText]         = useState("");
  const [showReset,          setShowReset]          = useState(false);

  const [expandedItems,  setExpandedItems]  = useState({});
  const [openSwipeId,    setOpenSwipeId]    = useState(null);
  const [pagination,     setPagination]     = useState({ displayed: PAGE_SIZE, total: 0 });

  // ── Documents state: { [orgId]: { loading, data } } ──────────────────────
  const [orgDocuments, setOrgDocuments] = useState({});

  const { useBreakpoint } = Grid;
  const screens  = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    getOrganizationList();
  }, []);

  // ── Fetch org list ────────────────────────────────────────────────────────
  const getOrganizationList = async () => {
    try {
      setTableLoader(true);
      const response = await GET(ORGANIZATION_API);
      if (response?.status === 200) {
        const data = response.data?.results || response.data || [];
        setOriginalData(data);
        setTableData(data);
        setPagination({ displayed: Math.min(PAGE_SIZE, data.length), total: data.length });
      } else {
        setTableData([]);
        setOriginalData([]);
      }
    } catch (error) {
      setTableData([]);
      setOriginalData([]);
    } finally {
      setTableLoader(false);
    }
  };

  // ── Fetch documents for a specific org (lazy — only when expanded) ────────
  const fetchOrgDocuments = async (orgId) => {
    // Skip if already loaded or loading
    if (orgDocuments[orgId]) return;

    setOrgDocuments((prev) => ({ ...prev, [orgId]: { loading: true, data: [] } }));
    try {
      const response = await GET(`${ORGANIZATION_DOCUMENTS_API}?organization_id=${orgId}`);
      if (response?.status === 200) {
        const docs = Array.isArray(response.data) ? response.data : [];
        setOrgDocuments((prev) => ({ ...prev, [orgId]: { loading: false, data: docs } }));
      } else {
        setOrgDocuments((prev) => ({ ...prev, [orgId]: { loading: false, data: [] } }));
      }
    } catch (error) {
      setOrgDocuments((prev) => ({ ...prev, [orgId]: { loading: false, data: [] } }));
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const onDelete = async (record) => {
    try {
      setDeleteLoader(true);
      const response = await DELETE(`${ORGANIZATION_API}${record.id}/`);
      if (response?.status === 200 || response?.status === 204) {
        const updated = tableData.filter((item) => item.id !== record.id);
        setTableData(updated);
        setOriginalData((prev) => prev.filter((item) => item.id !== record.id));
        setPagination((prev) => ({
          displayed: Math.min(prev.displayed, updated.length),
          total: updated.length,
        }));
        notification.success({
          message: `${record?.firm_name?.toUpperCase()} Deleted!`,
          description: "The organization has been deleted successfully.",
          duration: 0,
        });
      } else {
        notification.error({ message: "Delete Failed", description: "Could not delete the organization.", duration: 0 });
      }
    } catch (error) {
      notification.error({ message: "Delete Failed", description: "An error occurred while deleting.", duration: 0 });
    } finally {
      setDeleteLoader(false);
    }
  };

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = () => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      setTableData(originalData);
      setPagination({ displayed: Math.min(PAGE_SIZE, originalData.length), total: originalData.length });
      setSearchModalVisible(false);
      setShowReset(false);
      notification.info({ message: "Reset Search", description: "Showing all organizations." });
      return;
    }
    const filtered = originalData.filter((item) => {
      const firmName = (item.firm_name || "").toLowerCase();
      const place    = (item.place    || "").toLowerCase();
      const district = (item.district || "").toLowerCase();
      return firmName.includes(query) || place.includes(query) || district.includes(query);
    });
    setTableData(filtered);
    setPagination({ displayed: Math.min(PAGE_SIZE, filtered.length), total: filtered.length });
    setSearchModalVisible(false);
    setShowReset(true);
    if (filtered.length === 0) {
      notification.warning({ message: "No Results", description: `No matches found for "${searchText}".` });
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setTableData(originalData);
    setPagination({ displayed: Math.min(PAGE_SIZE, originalData.length), total: originalData.length });
    setShowReset(false);
    setSearchText("");
  };

  // ── Load more ─────────────────────────────────────────────────────────────
  const loadMore = () => {
    setPagination((prev) => ({
      ...prev,
      displayed: Math.min(prev.displayed + PAGE_SIZE, prev.total),
    }));
  };

  // ── Expand toggle — fetch documents on first expand ───────────────────────
  const handleExpandToggle = (id) => {
    setOpenSwipeId(null);
    setExpandedItems((prev) => {
      const isNowExpanded = !prev[id];
      if (isNowExpanded) {
        // Lazy-load documents when expanding
        fetchOrgDocuments(id);
        setTimeout(() => {
          const el = document.getElementById(`org-item-${id}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
      return { [id]: isNowExpanded };
    });
  };

  const handleSwipeStateChange = (id, isOpen) => {
    if (isOpen) setOpenSwipeId(id);
    else if (openSwipeId === id) setOpenSwipeId(null);
  };

  const handleEdit = (record) => navigate(`/organization/edit/${record.id}`);

  // ── Padding for last expanded item ────────────────────────────────────────
  const lastItem        = tableData[tableData.length - 1];
  const isLastExpanded  = lastItem ? expandedItems[lastItem.id] : false;
  const expandedCount   = tableData.filter((item) => expandedItems[item.id]).length;
  const paddingBottom   = isLastExpanded ? Math.max(MAX_VISIBLE_ITEMS - expandedCount, 0) * ITEM_HEIGHT : 0;

  return (
    <div className="view-org-page-content">
      {/* Header */}
      <div className="view-org-header-container">
        <h2 className="view-org-title">Organization List</h2>
        <div className="view-org-actions">
          <Button icon={<SearchOutlined />} onClick={() => setSearchModalVisible(true)} type="default">
            {!isMobile && "Search"}
          </Button>
          {showReset && (
            <Button icon={<ReloadOutlined />} onClick={handleReset} title="Reset to Original" />
          )}
        </div>
      </div>

      {/* Search Modal */}
      <Modal
        title={<div className="view-org-search-modal-title">Search Organization</div>}
        open={searchModalVisible}
        onOk={handleSearch}
        onCancel={() => setSearchModalVisible(false)}
        okText="Search">
        <p className="view-org-search-modal-label">Firm Name / Place / District</p>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Enter search term"
          className="view-org-search-input"
        />
      </Modal>

      {tableLoader && <Loader />}

      {/* List */}
      <div id="scrollableDiv-org" className="view-org-scrollable-div">

        {showReset && searchText && (
          <div className="view-org-search-results">
            <Tag color="blue" style={{ fontSize: 14, padding: "2px 8px" }}>
              Search: "{searchText}"
            </Tag>
          </div>
        )}

        {tableData.length > 0 && (
          <div className="view-org-group" style={{ paddingBottom }}>
            <div className="view-org-group-header">
              <div className="view-org-group-title-container">
                <Image
                  preview={false}
                  width={30}
                  height={30}
                  fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/%3E%3C/svg%3E"
                />
                <span className="view-org-group-title">Organizations</span>
              </div>
              <div className={showReset ? "view-org-badge view-org-badge-search" : "view-org-badge"}>
                {tableData.length}
              </div>
            </div>

            <div id="scrollableDiv-org-inner" className="view-org-list-container">
              <InfiniteScroll
                dataLength={pagination.displayed}
                next={loadMore}
                hasMore={pagination.displayed < pagination.total}
                loader={
                  <div className="view-org-skeleton-container">
                    <Skeleton avatar paragraph={{ rows: 1 }} active />
                  </div>
                }
                endMessage={
                  <Divider plain className="view-org-divider-container">
                    <span className="view-org-divider-star">★ </span>
                    <span className="view-org-divider-text">
                      End of list <span className="view-org-divider-star">★</span>
                    </span>
                  </Divider>
                }
                scrollableTarget="scrollableDiv-org-inner"
              >
                <List
                  dataSource={tableData.slice(0, pagination.displayed)}
                  className="view-org-list"
                  renderItem={(record, index) => {
                    const isExpanded   = expandedItems[record.id];
                    const lineIndex    = index + 1;
                    const docState     = orgDocuments[record.id] || { loading: false, data: [] };

                    return (
                      <div key={record.id} id={`org-item-${record.id}`} className="view-org-list-item-wrapper">
                        {isMobile ? (
                          <SwipeablePanel
                            item={{ ...record, lineIndex }}
                            index={record.id}
                            titleKey="firm_name"
                            name="organization"
                            onSwipeRight={!isExpanded ? () => handleEdit(record) : undefined}
                            onSwipeLeft={!isExpanded  ? () => onDelete(record)  : undefined}
                            isExpanded={isExpanded}
                            onExpandToggle={() => handleExpandToggle(record.id)}
                            renderContent={() =>
                              isExpanded ? (
                                <OrganizationCollapseContent
                                  org={record}
                                  documents={docState.data}
                                  documentsLoading={docState.loading}
                                />
                              ) : null
                            }
                            isSwipeOpen={openSwipeId === record.id}
                            onSwipeStateChange={(isOpen) => handleSwipeStateChange(record.id, isOpen)}
                          />
                        ) : (
                          <>
                            <List.Item
                              className={isExpanded ? "view-org-list-item view-org-list-item-expanded" : "view-org-list-item"}>
                              <List.Item.Meta
                                avatar={
                                  <div className="view-org-avatar-container">
                                    <span className="view-org-index-badge">{lineIndex}</span>
                                  </div>
                                }
                                title={
                                  <div
                                    onClick={() => handleExpandToggle(record.id)}
                                    className="view-org-item-title-container">
                                    <span className="view-org-item-title">{record.firm_name}</span>
                                    <Dropdown
                                      overlay={
                                        <Menu>
                                          <Menu.Item key="edit"
                                            onClick={(e) => { e.domEvent.stopPropagation(); handleEdit(record); }}>
                                            <div className="d-flex align-items-center gap-1">
                                              <span className="mdi mdi-pencil text-secondary mb-0"></span>
                                              <span>Edit</span>
                                            </div>
                                          </Menu.Item>
                                          <Menu.Item key="delete">
                                            <Popconfirm
                                              title={`Delete ${record.firm_name}?`}
                                              description="Are you sure you want to delete this organization permanently?"
                                              icon={<ExclamationCircleOutlined style={{ color: "red" }} />}
                                              onConfirm={(e) => { e.stopPropagation(); onDelete(record); }}
                                              okText="Delete"
                                              cancelText="Cancel"
                                              okButtonProps={{ danger: true, type: "primary" }}
                                              cancelButtonProps={{ type: "default" }}
                                              onClick={(e) => e.stopPropagation()}>
                                              <div className="d-flex align-items-center gap-1" style={{ color: "red" }}>
                                                <DeleteFilled style={{ color: "red" }} />
                                                <span>Delete</span>
                                              </div>
                                            </Popconfirm>
                                          </Menu.Item>
                                        </Menu>
                                      }
                                      trigger={["click"]}>
                                      <EllipsisOutlined
                                        className="view-org-ellipsis-icon"
                                        onClick={(e) => e.stopPropagation()} />
                                    </Dropdown>
                                  </div>
                                }
                              />
                            </List.Item>

                            {isExpanded && (
                              <div className="view-org-collapse-content">
                                <OrganizationCollapseContent
                                  org={record}
                                  documents={docState.data}
                                  documentsLoading={docState.loading}
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
        )}

        {tableData.length === 0 && !tableLoader && (
          <div className="view-org-no-data">
            <p>No organizations found{showReset && searchText ? ` for "${searchText}"` : "."}</p>
          </div>
        )}
      </div>

      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        tooltip={<div>Add New Organization</div>}
        onClick={() => navigate("/organization/add")}
        className="view-org-float-button"
      />
    </div>
  );
};

export default ViewOrganization;