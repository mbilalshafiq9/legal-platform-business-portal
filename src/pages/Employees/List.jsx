import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Dropdown } from "react-bootstrap";
import notificationProfile from "../../assets/images/notification-profile.png";
import ApiService from "../../services/ApiService";

// Custom Toggle for Dropdown
const CustomToggle = React.forwardRef(({ children, onClick }, ref) => (
  <button
    className="btn btn-light btn-sm rounded-circle text-center p-0 shadow-sm"
    style={{ width: "32px", height: "32px", border: "none"  }}
    ref={ref}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }}
  >
    {children}
  </button>
));

const EmployeesList = () => {
  // Load data from localStorage
  const loadFromLocalStorage = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      if (saved && saved !== 'undefined') {
        // Only parse if it looks like JSON
        if (saved.startsWith('{') || saved.startsWith('[') || saved.startsWith('"')) {
          return JSON.parse(saved);
        }
        return saved;
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
    }
    return defaultValue;
  };

  const [searchTerm, setSearchTerm] = useState(
    loadFromLocalStorage("employees_searchTerm", "")
  );
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const navigate = useNavigate();

  // Form states for Add New Team
  const [formData, setFormData] = useState({
    id: null,
    fullName: "",
    email: "",
    phone: "",
    location: "",
    role: "",
    roleId: "",
    employeeId: "",
    password: "",
  });

  const [employees, setEmployees] = useState(
    loadFromLocalStorage("employees_list", [])
  );
  const [loading, setLoading] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [roleForm, setRoleForm] = useState({
    id: null,
    name: "",
    description: "",
    permission_ids: [],
    selectedRoleId: null,
  });

  // Save employees to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("employees_list", JSON.stringify(employees));
      localStorage.setItem("employees_searchTerm", JSON.stringify(searchTerm));
    } catch (error) {
      console.error("Error saving employees data to localStorage:", error);
    }
  }, [employees, searchTerm]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await ApiService.request({
        method: "GET",
        url: "getTeams",
      });
      const data = response.data;
      if (data.status && data.data && data.data.teams) {
        const mapped = data.data.teams.map((t) => ({
          id: t.id,
          name: t.name,
          location: t.location || "Not specified",
          employeeId: t.employee_code || "",
          email: t.email || "",
          phone: t.phone || "",
          role: t.role || "Not specified",
          roleId: t.role_id || "",
          profileImage: notificationProfile,
          permissions: t.permissions || [],
        }));
        setEmployees(mapped);
      }
    } catch (error) {
      console.error("Error fetching teams", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      const [permRes, rolesRes] = await Promise.all([
        ApiService.request({ method: "GET", url: "getTeamPermissions" }),
        ApiService.request({ method: "GET", url: "getTeamRoles" }),
      ]);
      const permData = permRes.data;
      const rolesData = rolesRes.data;
      if (permData.status && permData.data?.permissions) {
        setPermissions(permData.data.permissions);
      }
      if (rolesData.status && rolesData.data?.roles) {
        setRoles(rolesData.data.roles);
      }
    } catch (error) {
      console.error("Error fetching roles/permissions", error);
    }
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEmployeeClick = (employeeId) => {
    // navigate(`/employees/${employeeId}`);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditEmployee = (employee, e) => {
    e.stopPropagation();
    setFormData({
      id: employee.id,
      fullName: employee.name,
      email: employee.email,
      phone: employee.phone,
      location: employee.location === "Not specified" ? "" : employee.location,
      role: employee.role === "Not specified" ? "" : employee.role,
      roleId: employee.roleId,
      employeeId: employee.employeeId,
      password: "",
    });
    setShowAddEmployee(true);
  };

  const handleDeleteEmployee = async (employeeId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this team member?")) {
      return;
    }

    try {
      const response = await ApiService.request({
        method: "POST",
        url: "deleteTeam",
        data: { id: employeeId },
      });
      const data = response.data;
      if (data.status) {
        setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
        toast.success(data.message || "Team member deleted successfully");
      } else {
        toast.error(data.message || "Failed to delete team member");
      }
    } catch (error) {
      console.error("Error deleting team member", error);
      toast.error("Failed to delete team member");
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast.error("Please fill in all required fields (Name, Email, Phone)");
      return;
    }

    // Generate employee ID if not provided
    const employeeId = formData.employeeId.trim() || `#${Date.now()}PL`;

    try {
      const selectedRole = roles.find((r) => r.id == formData.roleId);
      const selectedPermissions = selectedRole
        ? (selectedRole.permissions || []).map((p) => p.id)
        : [];

      const payload = {
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim() || "",
        employee_code: employeeId,
        role: selectedRole ? selectedRole.name : formData.role,
        role_id: formData.roleId || null,
        permissions: selectedPermissions,
        password: formData.password,
      };

      if (formData.id) {
        payload.id = formData.id;
      }

      const response = await ApiService.request({
        method: "POST",
        url: "saveTeam",
        data: payload,
      });
      const data = response.data;
      if (data.status && data.data && data.data.team) {
        const t = data.data.team;
        const savedEmployee = {
          id: t.id,
          name: t.name,
          location: t.location || "Not specified",
          employeeId: t.employee_code || employeeId,
          email: t.email || "",
          phone: t.phone || "",
          role: t.role || "Not specified",
          roleId: t.role_id || "",
          profileImage: notificationProfile,
          permissions: t.permissions || [],
        };

        setEmployees((prev) => {
          if (formData.id) {
            return prev.map((e) => (e.id === formData.id ? savedEmployee : e));
          } else {
            return [...prev, savedEmployee];
          }
        });
        toast.success(data.message || (formData.id ? "Employee updated successfully!" : "Employee added successfully!"));
      } else {
        toast.error(data.message || "Failed to save employee");
        return;
      }
    } catch (error) {
      console.error("Error saving employee", error);
      toast.error("Failed to save employee. Please try again.");
      return;
    }
    
    // Reset form and close offcanvas
    const emptyFormData = {
      id: null,
      fullName: "",
      email: "",
      phone: "",
      location: "",
      role: "",
      roleId: "",
      employeeId: "",
      password: "",
    };
    setFormData(emptyFormData);
    setShowAddEmployee(false);
    // Clear form data from localStorage
    try {
      localStorage.setItem("employees_formData", JSON.stringify(emptyFormData));
    } catch (error) {
      console.error("Error clearing form data from localStorage:", error);
    }
  };

  return (
    <div className="container-fluid employees--mukta-font">
      {/* Search and Filter Section */}
      <div
        className="row mb-4 bg-white px-4 py-5"
        style={{
          borderBottom: "0.1px solid #e6e6e6",
          borderTop: "0.1px solid #e6e6e6",
          marginTop: "30px",
          paddingLeft: "30px",
        }}
        data-aos="fade-up"
      >
        <div className="col-12">
          <div className="d-flex gap-3 align-items-center flex-wrap">
            <div
              className="position-relative"
              style={{ flex: "1", minWidth: "200px", maxWidth: "500px" }}
            >
              <i
                className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                style={{ zIndex: 10 }}
              ></i>
              <input
                type="text"
                className="form-control py-3 portal-form-hover"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  borderRadius: "50px",
                  border: "1px solid #e0e0e0",
                  fontSize: "14px",
                  paddingLeft: "45px",
                }}
              />
            </div>

            <div className="d-flex gap-2">
              <button
                className="btn btn-white px-4 py-3 d-flex align-items-center gap-2 employees-add-button"
                style={{
                  borderRadius: "50px",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: "500",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                }}
                onClick={() => {
                  setFormData({
                    id: null,
                    fullName: "",
                    email: "",
                    phone: "",
                    location: "",
                    role: "",
                    roleId: "",
                    employeeId: "",
                    password: "",
                  });
                  setShowAddEmployee(true);
                }}
              >
                <i className="bi bi-plus-circle-fill"></i>
                Add New Team
              </button>
              <button
                className="btn btn-outline-dark px-4 py-3 d-flex align-items-center gap-2"
                style={{
                  borderRadius: "50px",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
                onClick={async () => {
                  await fetchRolesAndPermissions();
                  setShowRolesModal(true);
                }}
              >
                <i className="bi bi-shield-lock-fill"></i>
                Roles &amp; Permissions
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid px-4 py-4">
        {/* Employees Grid */}
        <div className="row">
          {loading && (
            <div
              className="col-12 d-flex align-items-center justify-content-center"
              style={{ minHeight: "300px" }}
            >
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}

          {!loading && filteredEmployees.length === 0 && (
            <div
              className="col-12 d-flex align-items-center justify-content-center"
              style={{ minHeight: "300px" }}
            >
              <div className="text-center">
                <h5 className="text-muted">No team members found</h5>
              </div>
            </div>
          )}

          {!loading &&
            filteredEmployees.length > 0 &&
            filteredEmployees.map((employee, index) => (
            <div
              key={employee.id}
              className="col-lg-4 col-md-6 mb-4"
              data-aos="fade-up"
              data-aos-delay={index * 100}
            >
              <div
                className="card h-100 portal-card-hover"
                style={{ borderRadius: "12px", cursor: "pointer", position: "relative" }}
                onClick={() => handleEmployeeClick(employee.id)}
              >
                {/* Edit/Delete Actions */}
                <div className="position-absolute top-0 end-0 p-3" style={{ zIndex: 10 }}>
                  <Dropdown align="end" onClick={(e) => e.stopPropagation()}>
                    <Dropdown.Toggle as={CustomToggle}>
                      <i className="bi bi-three-dots-vertical"></i>
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                      <Dropdown.Item onClick={(e) => handleEditEmployee(employee, e)}>
                        <i className="bi bi-pencil me-2"></i> Edit
                      </Dropdown.Item>
                      <Dropdown.Item 
                        className="text-danger" 
                        onClick={(e) => handleDeleteEmployee(employee.id, e)}
                      >
                        <i className="bi bi-trash me-2"></i> Delete
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>

                <div className="card-body p-4">
                  <div className="d-flex align-items-start mb-3">
                    <div className="symbol symbol-60px me-3">
                      <img
                        src={employee.profileImage}
                        alt={employee.name}
                        className="rounded-circle"
                        style={{
                          width: "60px",
                          height: "60px",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                    <div className="flex-grow-1">
                      <h5 className="fw-bold text-dark mb-1">
                        {employee.name}
                      </h5>
                      <p className="text-gray-600 mb-0">{employee.location}</p>
                    </div>
                  </div>

                  <div className="employee-details">
                    {/* Default layout - 2 rows with 2 items each */}
                    <div className="employee-details-default">
                      <div className="row mb-2">
                        <div className="col-6">
                          <div className="d-flex align-items-center">
                            <i
                              className="bi bi-person-fill text-dark me-2"
                              style={{ width: "14px", fontSize: "12px" }}
                            ></i>
                            <span
                              className="text-dark fw-semibold"
                              style={{ fontSize: "13px" }}
                            >
                              {employee.employeeId}
                            </span>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="d-flex align-items-center">
                            <i
                              className="bi bi-envelope-fill text-dark me-2"
                              style={{ width: "14px", fontSize: "12px" }}
                            ></i>
                            <span
                              className="text-dark fw-semibold"
                              style={{ fontSize: "13px" }}
                            >
                              {employee.email}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-6">
                          <div className="d-flex align-items-center">
                            <i
                              className="bi bi-telephone-fill text-dark me-2"
                              style={{ width: "14px", fontSize: "12px" }}
                            ></i>
                            <span
                              className="text-dark fw-semibold"
                              style={{ fontSize: "13px" }}
                            >
                              {employee.phone}
                            </span>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="d-flex align-items-center">
                            <i
                              className="bi bi-gear-fill text-dark me-2"
                              style={{ width: "14px", fontSize: "12px" }}
                            ></i>
                            <span
                              className="text-dark fw-semibold"
                              style={{ fontSize: "13px" }}
                            >
                              Role: {employee.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hover layout - 2 rows with 2 items each */}
                    <div className="employee-details-hover">
                      <div className="row mb-2">
                        <div className="col-6">
                          <div className="d-flex align-items-center">
                            <i
                              className="bi bi-person-fill text-white me-2"
                              style={{ width: "14px", fontSize: "12px" }}
                            ></i>
                            <span
                              className="text-white fw-semibold"
                              style={{ fontSize: "13px" }}
                            >
                              {employee.employeeId}
                            </span>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="d-flex align-items-center">
                            <i
                              className="bi bi-envelope-fill text-white me-2"
                              style={{ width: "14px", fontSize: "12px" }}
                            ></i>
                            <span
                              className="text-white fw-semibold"
                              style={{ fontSize: "13px" }}
                            >
                              {employee.email}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-6">
                          <div className="d-flex align-items-center">
                            <i
                              className="bi bi-telephone-fill text-white me-2"
                              style={{ width: "14px", fontSize: "12px" }}
                            ></i>
                            <span
                              className="text-white fw-semibold"
                              style={{ fontSize: "13px" }}
                            >
                              {employee.phone}
                            </span>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="d-flex align-items-center">
                            <i
                              className="bi bi-gear-fill text-white me-2"
                              style={{ width: "14px", fontSize: "12px" }}
                            ></i>
                            <span
                              className="text-white fw-semibold"
                              style={{ fontSize: "13px" }}
                            >
                              Role: {employee.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roles & Permissions Modal */}
      {showRolesModal && (
        <>
          <div
            className="offcanvas offcanvas-end show"
            tabIndex="-1"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              visibility: "visible",
              width: "633px",
              transition: "all 0.3s ease-out",
              borderRadius: "13px",
              margin: "20px",
              zIndex: 1045,
              backgroundColor: "#fff",
            }}
          >
            <div className="offcanvas-header border-bottom">
              <h5 className="offcanvas-title fw-bold">Roles &amp; Permissions</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowRolesModal(false)}
              ></button>
            </div>
            <div className="offcanvas-body p-4" style={{ overflowY: "auto" }}>
              <div className="mb-4">
                <label className="form-label fw-semibold">Role Name</label>
                <input
                  type="text"
                  className="form-control portal-form-hover"
                  placeholder="Enter role name"
                  value={roleForm.name}
                  onChange={(e) =>
                    setRoleForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="mb-4">
                <label className="form-label fw-semibold">Description</label>
                <textarea
                  className="form-control portal-form-hover"
                  rows="3"
                  placeholder="Describe this role"
                  value={roleForm.description}
                  onChange={(e) =>
                    setRoleForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                ></textarea>
              </div>
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  Permissions
                </label>
                <div className="row">
                  {permissions.map((perm) => (
                    <div className="col-12 col-md-6 mb-2" key={perm.id}>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`perm-${perm.id}`}
                          checked={roleForm.permission_ids.includes(perm.id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setRoleForm((prev) => {
                              const current = prev.permission_ids || [];
                              if (checked) {
                                return {
                                  ...prev,
                                  permission_ids: [...current, perm.id],
                                };
                              }
                              return {
                                ...prev,
                                permission_ids: current.filter(
                                  (id) => id !== perm.id
                                ),
                              };
                            });
                          }}
                        />
                        <label
                          className="form-check-label"
                          htmlFor={`perm-${perm.id}`}
                        >
                          {perm.label}{" "}
                          {perm.module ? `(${perm.module})` : ""}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold">
                  Existing Roles
                </label>
                <ul className="list-group">
                  {roles.map((role) => (
                    <li
                      key={role.id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setRoleForm({
                          id: role.id,
                          name: role.name,
                          description: role.description || "",
                          permission_ids: (role.permissions || []).map(
                            (p) => p.id
                          ),
                        })
                      }
                    >
                      <span>{role.name}</span>
                      <span className="badge bg-light text-dark">
                        {(role.permissions || []).length} permissions
                      </span>
                    </li>
                  ))}
                  {roles.length === 0 && (
                    <li className="list-group-item text-muted">
                      No roles created yet.
                    </li>
                  )}
                </ul>
              </div>

              <div className="text-end">
                <button
                  type="button"
                  className="btn btn-light me-3"
                  onClick={() =>
                    setRoleForm({
                      id: null,
                      name: "",
                      description: "",
                      permission_ids: [],
                    })
                  }
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={async () => {
                    if (!roleForm.name.trim()) {
                      toast.error("Role name is required");
                      return;
                    }
                    try {
                      const response = await ApiService.request({
                        method: "POST",
                        url: "saveTeamRole",
                        data: roleForm,
                      });
                      const data = response.data;
                      if (data.status && data.data?.role) {
                        const saved = data.data.role;
                        setRoles((prev) => {
                          const exists = prev.find((r) => r.id === saved.id);
                          if (exists) {
                            return prev.map((r) =>
                              r.id === saved.id ? saved : r
                            );
                          }
                          return [...prev, saved];
                        });
                        toast.success(data.message || "Role saved successfully");
                      } else {
                        toast.error(data.message || "Failed to save role");
                      }
                    } catch (error) {
                      console.error("Error saving role", error);
                      toast.error("Failed to save role. Please try again.");
                    }
                  }}
                >
                  Save Role
                </button>
              </div>
            </div>
          </div>
          <div
            className="offcanvas-backdrop fade show"
            onClick={() => setShowRolesModal(false)}
          ></div>
        </>
      )}

      {/* Add New/Edit Employee Offcanvas */}
      <div
        className={`offcanvas offcanvas-end ${showAddEmployee ? "show" : ""}`}
        tabIndex="-1"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          visibility: showAddEmployee ? "visible" : "hidden",
          zIndex: 1045,
        }}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title fw-bold">
            {formData.id ? "Edit Team Member" : "Add New Team"}
          </h5>
          <button
            type="button"
            className="btn-close"
            onClick={() => {
              setShowAddEmployee(false);
              // Keep form data in localStorage when closing (user might reopen)
            }}
          ></button>
        </div>
        <div
          className="offcanvas-body p-0 d-flex flex-column"
          style={{ height: "100%" }}
        >
          <div className="p-4 flex-grow-1" style={{ overflowY: "auto" }}>
            <form onSubmit={handleAddEmployee}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Full Name</label>
                <input
                  type="text"
                  className="form-control portal-form-hover"
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Email</label>
                <input
                  type="email"
                  className="form-control portal-form-hover"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Password</label>
                <input
                  type="password"
                  className="form-control portal-form-hover"
                  placeholder={formData.id ? "Leave blank to keep current password" : "Enter password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  required={!formData.id}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Phone</label>
                <input
                  type="tel"
                  className="form-control portal-form-hover"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Location</label>
                <input
                  type="text"
                  className="form-control portal-form-hover"
                  placeholder="Enter location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Role</label>
                <select
                  className="form-select portal-form-hover"
                  value={formData.roleId || ""}
                  onChange={(e) => {
                    handleInputChange("roleId", e.target.value);
                    const selectedRole = roles.find(r => r.id == e.target.value);
                    if (selectedRole) {
                        handleInputChange("role", selectedRole.name);
                    }
                  }}
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Employee ID</label>
                <input
                  type="text"
                  className="form-control portal-form-hover"
                  placeholder="Enter employee ID (optional)"
                  value={formData.employeeId}
                  onChange={(e) => handleInputChange("employeeId", e.target.value)}
                />
              </div>
            </form>
          </div>
          <div
            className="p-4 border-top"
            style={{
              backgroundColor: "#fff",
              borderBottomLeftRadius: "15px",
              borderBottomRightRadius: "15px",
            }}
          >
            <button
              type="button"
              className="btn text-white rounded-pill w-100 portal-button-hover"
              onClick={handleAddEmployee}
              style={{
                height: "63px",
                fontSize: "20px",
                fontWeight: "500",
                backgroundColor: "#474747",
              }}
            >
              {formData.id ? "Update Team Member" : "Add Team Member"}
            </button>
          </div>
        </div>
      </div>
      {showAddEmployee && <div className="offcanvas-backdrop fade show"></div>}
    </div>
  );
};

export default EmployeesList;
