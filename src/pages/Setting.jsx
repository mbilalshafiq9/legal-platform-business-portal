import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ApiService from "../services/ApiService";
import Loader from "../components/Loader";
import { Dropdown } from "primereact/dropdown";

const Setting = () => {
  const navigate = useNavigate();
  const admin = (() => {
    try {
      const adminStr = localStorage.getItem("admin");
      if (adminStr && adminStr !== "undefined" && adminStr.startsWith("{")) {
        return JSON.parse(adminStr);
      }
    } catch (e) {
      console.error("Error parsing admin in Settings", e);
    }
    return null;
  })();

  const currency = process.env.REACT_APP_CURRENCY;

  const [isLoader, setIsLoader] = useState(false);
  
  // Load data from localStorage
  const loadFromLocalStorage = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      if (saved && saved !== 'undefined') {
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

  const [formData, setFormData] = useState(
    loadFromLocalStorage("settings_formData", {
      platform_fee: "",
      android_version: "",
      ios_version: "",
      payment_mode: "",
    })
  );

  const paymentOptions = [
    { label: "Test", value: "test" },
    { label: "Live", value: "live" },
  ];

    useEffect(() => {
        getSingleData();
    }, []);

    // Save formData to localStorage whenever it changes
    useEffect(() => {
      try {
        localStorage.setItem("settings_formData", JSON.stringify(formData));
      } catch (error) {
        console.error("Error saving settings formData to localStorage:", error);
      }
    }, [formData]);

  const getSingleData = async () => {
    setIsLoader(true);
    try {
      const response = await ApiService.request({
        method: "GET",
        url: `settings`,
      });
      const data = response.data;
      if (data.status) {
        const updatedFormData = data.data;
        setFormData(updatedFormData);
        // Save to localStorage when loaded from API
        try {
          localStorage.setItem("settings_formData", JSON.stringify(updatedFormData));
        } catch (error) {
          console.error("Error saving settings formData to localStorage:", error);
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoader(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoader(true);
    try {
      const response = await ApiService.request({
        method: "PUT",
        url: "settings",
        data: formData,
      });
      const data = response.data;
      if (data.status) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      setIsLoader(false);
    } catch (error) {
      console.log(error);

      setIsLoader(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  return (
    <div className="d-flex flex-column flex-column-fluid">
      <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
        <div
          id="kt_app_toolbar_container"
          className="app-container container-fluid d-flex flex-stack"
        >
          <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
            <h1 className="page-heading d-flex text-dark fw-bold fs-3 flex-column justify-content-center my-0">
              Settings
            </h1>
            <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
              <li className="breadcrumb-item text-muted">
                <a
                  href="/TimeLogger/admin/"
                  className="text-muted text-hover-primary"
                >
                  Home
                </a>
              </li>
              <li className="breadcrumb-item">
                <span className="bullet bg-gray-400 w-5px h-2px"></span>
              </li>
              <li className="breadcrumb-item text-muted">Settings</li>
            </ul>
          </div>
          <div className="d-flex align-items-center gap-2 gap-lg-3"></div>
        </div>
      </div>

      <div id="kt_app_content" className="app-content flex-column-fluid">
        <div
          id="kt_app_content_container"
          className="app-container container-fluid"
        >
          <div className="card">
            <div className="card-body pt-0">
              <div className="mb-8 text-center"></div>
              <div className="row g-9 mb-8">
                <div className="col-md-12">
                  <form className="form" onSubmit={handleSubmit}>
                    <div className="row">
                      {/* <div className="col-md-6 my-3">
                        <label className="d-flex align-items-center fs-6 fw-semibold mb-2">
                          <span className="required">
                            Platform Fee ({currency}){" "}
                          </span>
                        </label>
                        <input
                          type="number"
                          step={0.01}
                          name="platform_fee"
                          value={formData.platform_fee}
                          onChange={handleChange}
                          required
                          className="form-control form-control-solid"
                          placeholder="Enter Platform Fee"
                        />
                      </div> */}

                      <div className="col-md-6 my-3">
                        <label className="d-flex align-items-center fs-6 fw-semibold mb-2">
                          <span className="required">Android Version</span>
                        </label>
                        <input
                          type="number"
                          step={0.01}
                          name="android_version"
                          value={formData.android_version}
                          onChange={handleChange}
                          required
                          className="form-control form-control-solid"
                          placeholder="Enter Android Version"
                        />
                      </div>
                      <div className="col-md-6 my-3">
                        <label className="d-flex align-items-center fs-6 fw-semibold mb-2">
                          <span className="required">IOS Version</span>
                        </label>
                        <input
                          type="number"
                          step={0.01}
                          name="ios_version"
                          value={formData.ios_version}
                          required
                          onChange={handleChange}
                          className="form-control form-control-solid"
                          placeholder="Enter IOS Version"
                        />
                      </div>

                      {/* <div className="col-md-6 my-3">
                        <label className="d-flex required align-items-center fs-6 fw-semibold mb-2">
                          <span>Payment Mode</span>
                        </label>
                        <Dropdown
                          name="payment_mode"
                          value={formData.payment_mode}
                          options={paymentOptions}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              payment_mode: e.value,
                            })
                          }
                          placeholder="Select Payment Mode"
                          className="w-100"
                          required
                        />
                      </div> */}
                    </div>

                    <button
                      type="submit"
                      className="btn btn-base my-5"
                      disabled={isLoader}
                    >
                      <span className="indicator-label">
                        {!isLoader ? (
                          "Update Settings"
                        ) : (
                          <Loader size="20" text="Updating" />
                        )}
                      </span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setting;
