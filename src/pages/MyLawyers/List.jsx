import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import notificationProfile from "../../assets/images/notification-profile.png";
import NoMessage from "../../assets/images/NoMessage.png";
import NoLawyer from "../../assets/images/NoLawyer.png";
import ApiService from "../../services/ApiService";
import { toast } from "react-toastify";

const formatMessageText = (text = "") => {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const List = () => {
  // Load data from localStorage
  const loadFromLocalStorage = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
    }
    return defaultValue;
  };

  const ensureAvatar = (entity, fallback = notificationProfile) => {
    const normalize = (value) => {
      if (!value) return fallback;
      if (typeof value === "string") {
        return value.includes("notification-profile")
          ? fallback
          : value;
      }
      return fallback;
    };

    if (!entity) return entity;
    if (Array.isArray(entity)) {
      return entity.map((item) => ({
        ...item,
        avatar: normalize(item?.avatar),
      }));
    }
    return {
      ...entity,
      avatar: normalize(entity?.avatar),
    };
  };

  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [activeTab, setActiveTab] = useState("chats");
  const [activeSubTab, setActiveSubTab] = useState("active");
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileInputRef, setFileInputRef] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatContacts, setChatContacts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [activeLawyers, setActiveLawyers] = useState([]);
  const [inactiveLawyers, setInactiveLawyers] = useState([]);
  const [loadingLawyers, setLoadingLawyers] = useState(false);
  const [currentChatData, setCurrentChatData] = useState(null); // Store chat data with lawyer info
  const [userPicture, setUserPicture] = useState(null); // Store current user picture

  // Fetch user profile to get user picture
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await ApiService.request({
          method: "GET",
          url: "getProfile",
        });
        const data = response.data;
        if (data.status && data.data && data.data.picture) {
          setUserPicture(data.data.picture);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };
    fetchUserProfile();
  }, []);

  // Fetch active and inactive lawyers from API
  useEffect(() => {
    const fetchLawyers = async () => {
      if (activeTab !== "lawyers") return;
      
      try {
        setLoadingLawyers(true);
        
        // Fetch active lawyers
        const activeResponse = await ApiService.request({
          method: "GET",
          url: "getMyServices",
          data: { status: "active" }
        });
        
        // Fetch inactive lawyers
        const inactiveResponse = await ApiService.request({
          method: "GET",
          url: "getMyServices",
          data: { status: "inactive" }
        });
        
        // Transform active lawyers
        if (activeResponse.data.status && activeResponse.data.data && activeResponse.data.data.items) {
          const transformedActive = activeResponse.data.data.items.map((service) => {
            const lawyer = service.lawyer || {};
            const categories = lawyer.categories || [];
            const subCategories = lawyer.sub_categories || [];
            const allCategories = [...categories, ...subCategories];
            const categoryNames = allCategories.map(cat => cat.name);
            const specializations = categoryNames.length > 0 
              ? categoryNames.slice(0, 2).join(", ") + (categoryNames.length > 2 ? "+" : "")
              : "Lawyer";
            
            // Format renewal date
            let renewalDate = "";
            if (service.expiry_date) {
              const expiryDate = new Date(service.expiry_date);
              const now = new Date();
              if (expiryDate > now) {
                renewalDate = `Renew ${expiryDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}`;
              } else {
                renewalDate = `Expired ${expiryDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}`;
              }
            }
            
            return {
              id: service.id,
              lawyerId: lawyer.id,
              name: lawyer.name || "Lawyer",
              title: categories[0]?.name || subCategories[0]?.name || "Lawyer",
              status: service.status || "Active",
              avatar: lawyer.picture || notificationProfile,
              specializations: specializations,
              renewalDate: renewalDate,
              price: service.pay_amount ? `$${service.pay_amount} USD` : "$0 USD",
              unreadCount: service.chat_unread || 0,
              rawData: service,
            };
          });
          
          setActiveLawyers(ensureAvatar(transformedActive));
        } else {
          setActiveLawyers([]);
        }
        
        // Transform inactive lawyers
        if (inactiveResponse.data.status && inactiveResponse.data.data && inactiveResponse.data.data.items) {
          const transformedInactive = inactiveResponse.data.data.items.map((service) => {
            const lawyer = service.lawyer || {};
            const categories = lawyer.categories || [];
            const subCategories = lawyer.sub_categories || [];
            const allCategories = [...categories, ...subCategories];
            const categoryNames = allCategories.map(cat => cat.name);
            const specializations = categoryNames.length > 0 
              ? categoryNames.slice(0, 2).join(", ") + (categoryNames.length > 2 ? "+" : "")
              : "Lawyer";
            
            // Format renewal date
            let renewalDate = "";
            if (service.expiry_date) {
              const expiryDate = new Date(service.expiry_date);
              renewalDate = `Expired ${expiryDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}`;
            } else {
              renewalDate = "Expired";
            }
            
            return {
              id: service.id,
              lawyerId: lawyer.id,
              name: lawyer.name || "Lawyer",
              title: categories[0]?.name || subCategories[0]?.name || "Lawyer",
              status: service.status || "Inactive",
              avatar: lawyer.picture || notificationProfile,
              specializations: specializations,
              renewalDate: renewalDate,
              price: service.pay_amount ? `$${service.pay_amount} USD` : "$0 USD",
              unreadCount: service.chat_unread || 0,
              rawData: service,
            };
          });
          
          setInactiveLawyers(ensureAvatar(transformedInactive));
        } else {
          setInactiveLawyers([]);
        }
      } catch (error) {
        console.error("Error fetching lawyers:", error);
        toast.error("Failed to load lawyers");
        setActiveLawyers([]);
        setInactiveLawyers([]);
      } finally {
        setLoadingLawyers(false);
      }
    };

    fetchLawyers();
  }, [activeTab, activeSubTab]);

  // Fetch chats from API using getChats
  useEffect(() => {
    const fetchChats = async () => {
      if (activeTab !== "chats") return;
      
      try {
        setLoading(true);
        
        // Fetch both service and normal chats
        const [serviceResponse, normalResponse] = await Promise.all([
          ApiService.request({
            method: "GET",
            url: "getChats",
            data: { type: "service" }
          }),
          ApiService.request({
            method: "GET",
            url: "getChats",
            data: { type: "normal" }
          })
        ]);
        
        // Combine both types of chats
        const allChats = [];
        
        if (serviceResponse.data.status && serviceResponse.data.data && serviceResponse.data.data.chats) {
          allChats.push(...serviceResponse.data.data.chats);
        }
        
        if (normalResponse.data.status && normalResponse.data.data && normalResponse.data.data.chats) {
          allChats.push(...normalResponse.data.data.chats);
        }
        
        if (allChats.length > 0) {
          // Sort by latest message time
          allChats.sort((a, b) => {
            const timeA = a.latest_message_time ? new Date(a.latest_message_time).getTime() : 0;
            const timeB = b.latest_message_time ? new Date(b.latest_message_time).getTime() : 0;
            return timeB - timeA;
          });
          
          // Transform API data to match component format
          const transformedChats = allChats.map((chat) => {
            const lawyer = chat.lawyer || {};
            const lastMessageTime = chat.latest_message_time 
              ? new Date(chat.latest_message_time).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })
              : "";
            
            return {
              id: chat.id,
              chatId: chat.id,
              lawyerId: chat.lawyer_id,
              name: lawyer.name || "Lawyer",
              lastMessage: "", // Will be updated when we fetch messages
              time: lastMessageTime,
              unread: 0, // Will be updated when we fetch messages
              avatar: lawyer.picture || notificationProfile,
              userService: chat.user_service,
              type: chat.type || "service",
              rawData: chat,
            };
          });
          
          setChatContacts(transformedChats);
        } else {
          setChatContacts([]);
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
        toast.error("Failed to load chats");
        setChatContacts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [activeTab]);

  // Fetch messages when chat is selected
  useEffect(() => {
    const fetchChatMessages = async () => {
      if (!selectedChat) {
        setMessages([]);
        return;
      }

      try {
        setLoadingMessages(true);
        const response = await ApiService.request({
          method: "GET",
          url: "getChatMessages",
          data: { chat_id: selectedChat.chatId }
        });
        
        const data = response.data;
        if (data.status && data.data) {
          // Store chat data (includes lawyer info)
          if (data.data.chat) {
            setCurrentChatData(data.data.chat);
          }
          
          // Transform API messages to match component format
          let transformedMessages = [];
          if (data.data.messages) {
            transformedMessages = data.data.messages.map((msg) => {
            const messageTime = msg.created_at 
              ? new Date(msg.created_at).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })
              : "";
            
            return {
              id: msg.id,
              text: msg.message || "",
              time: messageTime,
              isFromUser: msg.sender === "user",
              sender: msg.sender,
              created_at: msg.created_at,
                file: msg.file ? {
                  name: msg.file,
                  url: msg.file_url || (msg.file ? (() => {
                    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
                    // Remove /api from base URL and add storage path
                    const storageBaseUrl = baseUrl.replace('/api', '');
                    return `${storageBaseUrl}/storage/uploads/${msg.file}`;
                  })() : null),
                  type: msg.file_type || 'doc',
                } : null,
              rawData: msg,
            };
          });
          
          setMessages(transformedMessages);
          } else {
            setMessages([]);
          }
          
          // Update last message and unread count in chat contacts
          if (transformedMessages.length > 0) {
            const lastMsg = transformedMessages[0]; // Messages are ordered latest first
            const unreadCount = transformedMessages.filter(msg => msg.sender === "lawyer" && !msg.is_read).length;
            
            setChatContacts(prev => prev.map(chat => 
              chat.chatId === selectedChat.chatId
                ? { 
                    ...chat, 
                    lastMessage: lastMsg.text, 
                    time: lastMsg.time,
                    unread: unreadCount
                  }
                : chat
            ));
          }
          
          // Mark messages as read
          try {
            await ApiService.request({
              method: "POST",
              url: "readChatMessages",
              data: { chat_id: selectedChat.chatId }
            });
            
            // Update unread count to 0 after marking as read
            setChatContacts(prev => prev.map(chat => 
              chat.chatId === selectedChat.chatId
                ? { ...chat, unread: 0 }
                : chat
            ));
          } catch (error) {
            console.error("Error marking messages as read:", error);
          }
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error("Error fetching chat messages:", error);
        toast.error("Failed to load messages");
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchChatMessages();
  }, [selectedChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    setSelectedChat(contact);
  };

  // Helper function to get file type from extension
  const getFileType = (fileName) => {
    if (!fileName) return '';
    const ext = fileName.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
    
    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    return 'doc';
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef) {
      fileInputRef.value = '';
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedChat) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    const fileToSend = selectedFile;
    setSelectedFile(null);
    if (fileInputRef) {
      fileInputRef.value = '';
    }
    setSendingMessage(true);

    // Optimistically add message to UI
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    const tempMsg = {
      id: `temp-${Date.now()}`,
      text: formatMessageText(messageText || (fileToSend ? `File: ${fileToSend.name}` : '')),
      time: currentTime,
      isFromUser: true,
      sender: "user",
      isPending: true,
      file: fileToSend ? { name: fileToSend.name, type: getFileType(fileToSend.name) } : null,
    };
    
    setMessages(prev => [...prev, tempMsg]);

    try {
      // Prepare FormData if file is present
      let requestData;
      let headers = {};
      
      if (fileToSend) {
        const formData = new FormData();
        formData.append('chat_id', selectedChat.chatId);
        if (messageText) {
          formData.append('message', messageText);
        }
        formData.append('file', fileToSend);
        formData.append('file_type', getFileType(fileToSend.name));
        requestData = formData;
        // Don't set Content-Type header - browser will set it automatically with boundary for FormData
        headers = {};
      } else {
        requestData = {
          chat_id: selectedChat.chatId,
          message: messageText,
        };
        headers = {
          'Content-Type': 'application/json',
        };
      }

      const response = await ApiService.request({
        method: "POST",
        url: "sendMessage",
        data: requestData,
        headers: headers,
      });

      const data = response.data;
      if (data.status && data.data) {
        // Replace temp message with actual message from API
        const actualMsg = {
          id: data.data.id,
          text: formatMessageText(data.data.message || messageText || ''),
          time: data.data.created_at 
            ? new Date(data.data.created_at).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })
            : currentTime,
          isFromUser: true,
          sender: "user",
          created_at: data.data.created_at,
          file: data.data.file ? {
            name: data.data.file,
            url: data.data.file_url || data.data.file, // API might return full URL
            type: data.data.file_type || 'doc',
          } : null,
          rawData: data.data,
        };
        
        setMessages(prev => prev.map(msg => 
          msg.id === tempMsg.id ? actualMsg : msg
        ));
        
        // Update last message in chat contacts
        setChatContacts(prev => prev.map(chat => 
          chat.chatId === selectedChat.chatId
            ? { ...chat, lastMessage: actualMsg.text, time: actualMsg.time }
            : chat
        ));
      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempMsg.id));
        toast.error(data.message || "Failed to send message");
        setNewMessage(messageText); // Restore message text
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMsg.id));
      toast.error("Failed to send message. Please try again.");
      setNewMessage(messageText); // Restore message text
    } finally {
      setSendingMessage(false);
    }
  };

  const getCurrentData = () => {
    if (activeTab === "lawyers") {
      return activeSubTab === "active" ? activeLawyers : inactiveLawyers;
    } else {
      return chatContacts;
    }
  };

  // Calculate unread counts for badges
  const getUnreadChatsCount = () => {
    return chatContacts.reduce(
      (total, contact) => total + (contact.unread || 0),
      0
    );
  };

  const getUnreadLawyersCount = () => {
    const activeUnread = activeLawyers.reduce(
      (total, lawyer) => total + (lawyer.unreadCount || 0),
      0
    );
    const inactiveUnread = inactiveLawyers.reduce(
      (total, lawyer) => total + (lawyer.unreadCount || 0),
      0
    );
    return activeUnread + inactiveUnread;
  };

  return (
    <div className="d-flex flex-column flex-column-fluid my-lawyers-page my-lawyers-main-container">
      <div id="kt_app_content" className="app-content flex-column-fluid pb-0">
        <div
          id="kt_app_content_container"
          className="app-container container-xxl h-100 px-0 mx-0"
        >
          <div className="row h-100 g-0">
            {/* Left Panel - Contact List */}
            <div className={`col-lg-4 col-md-5 ${selectedContact ? 'd-none d-lg-block' : ''}`}>
              <div className="d-flex flex-column h-100 my-lawyers-left-panel">
                {/* Main Tabs */}
                <div
                  className="py-4"
                  data-aos="fade-right"
                  data-aos-delay="100"
                >
                  <div className="d-flex gap-2 my-lawyers-tabs-container">
                    <button
                      className={`btn flex-fill d-flex align-items-center justify-content-center gap-2 my-lawyers-main-tab ${
                        activeTab === "chats"
                          ? "border-bottom-3px text-black rounded-0 active"
                          : "text-black"
                      }`}
                      onClick={() => setActiveTab("chats")}
                    >
                      Chats
                      {getUnreadChatsCount() > 0 && (
                        <span className="badge bg-black text-white rounded-pill">
                          {getUnreadChatsCount()}
                        </span>
                      )}
                    </button>
                    <button
                      className={`btn flex-fill d-flex align-items-center justify-content-center gap-2 my-lawyers-main-tab ${
                        activeTab === "lawyers"
                          ? "border-bottom-3px text-black rounded-0 active"
                          : "text-black"
                      }`}
                      onClick={() => setActiveTab("lawyers")}
                    >
                      My Lawyers
                      {getUnreadLawyersCount() > 0 && (
                        <span className="badge bg-black text-white rounded-pill">
                          {getUnreadLawyersCount()}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sub Tabs (only for Lawyers tab) */}
                {activeTab === "lawyers" && (
                  <div
                    className="px-4 pb-3"
                    data-aos="fade-right"
                    data-aos-delay="200"
                  >
                    <div className="d-flex gap-2 my-lawyers-sub-tabs">
                      <button
                        className={`btn flex-fill ${
                          activeSubTab === "active"
                            ? "bg-black text-white"
                            : "btn-light text-black"
                        }`}
                        onClick={() => setActiveSubTab("active")}
                      >
                        Active Lawyers
                      </button>
                      <button
                        className={`btn flex-fill ${
                          activeSubTab === "inactive"
                            ? "bg-black text-white"
                            : "btn-light text-black"
                        }`}
                        onClick={() => setActiveSubTab("inactive")}
                      >
                        Inactive Lawyers
                      </button>
                    </div>
                  </div>
                )}

                {/* Search Bar for Chats Tab */}
                {activeTab === "chats" && (
                  <div
                    className="p-4"
                    data-aos="fade-right"
                    data-aos-delay="200"
                  >
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control form-control-lg rounded-pill my-lawyers-search-input"
                        placeholder="Search"
                      />
                      <i className="bi bi-search position-absolute top-50 translate-middle-y text-muted fs-4 ms-4"></i>
                    </div>
                  </div>
                )}

                {/* Contact List */}
                <div
                  className={`flex-fill overflow-auto d-flex justify-content-start align-items-center flex-column ${
                    activeTab === "chats"
                      ? "my-lawyers-contact-list-chats"
                      : "my-lawyers-contact-list"
                  }`}
                >
                  {(loading && activeTab === "chats") || (loadingLawyers && activeTab === "lawyers") ? (
                    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "200px" }}>
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : getCurrentData().length === 0 ? (
                    <div className="d-flex justify-content-center align-items-center text-center p-4" style={{ minHeight: "200px" }}>
                      <div>
                        <p className="text-muted mb-0">No {activeTab === "chats" ? "chats" : "lawyers"} found</p>
                      </div>
                    </div>
                  ) : (
                  getCurrentData().map((item, index) => (
                    <div
                      key={item.id || item.chatId}
                      className={`p-3 cursor-pointer mb-3 my-lawyers-contact-card ${
                        (selectedContact?.chatId && item.chatId && selectedContact.chatId === item.chatId) || 
                        (selectedContact?.id === item.id)
                          ? "my-lawyers-contact-card-active"
                          : "bg-white"
                      }`}
                      onClick={() => handleContactSelect(item)}
                    >
                      {activeTab === "lawyers" ? (
                        // Lawyers Layout
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center flex-fill">
                            <div className="symbol symbol-40px me-3">
                              <img
                                src={item.avatar}
                                alt={item.name}
                                className="rounded-circle my-lawyers-avatar-40"
                              />
                            </div>
                            <div className="flex-fill">
                              <h6 className="mb-1 fw-bold text-dark my-lawyers-lawyer-name">
                                {item.name}
                              </h6>
                              <p className="text-muted mb-1 fs-7 my-lawyers-lawyer-title">
                                {item.title}
                              </p>
                              <p className="text-muted mb-2 fs-8 my-lawyers-lawyer-specializations d-none d-md-block">
                                {item.specializations}
                              </p>
                              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                                <small className="text-muted my-lawyers-lawyer-renewal mb-1 mb-md-0">
                                  {item.renewalDate}
                                </small>
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-bold text-dark my-lawyers-lawyer-price">
                                    {item.price}
                                  </span>
                                  {item.unreadCount > 0 && (
                                    <span className="badge bg-dark text-white rounded-circle my-lawyers-unread-badge">
                                      {item.unreadCount}
                                    </span>
                                  )}
                                  <i className="bi bi-chevron-right text-muted"></i>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Chats Layout - Clean minimalist design
                        <div className="d-flex align-items-center">
                          <div className="symbol symbol-40px me-3">
                            <img
                              src={item.avatar}
                              alt={item.name}
                              className="rounded-circle my-lawyers-avatar-40"
                            />
                          </div>
                          <div className="flex-fill my-lawyers-chat-flex-fill">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <h6 className="mb-0 fw-bold text-dark text-truncate me-2 my-lawyers-name-truncate my-lawyers-chat-name">
                                {item.name}
                              </h6>
                              <small className="text-muted fs-8 my-lawyers-chat-time">
                                {item.time}
                              </small>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                              <p
                                className="text-muted mb-0 fs-7 my-lawyers-message-text flex-fill me-2 my-lawyers-chat-message"
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "calc(100% - 40px)",
                                }}
                              >
                                {item.lastMessage}
                              </p>
                              {item.unread > 0 && (
                                <span
                                  className={`badge rounded-pill my-lawyers-chat-unread-badge ${
                                    selectedContact?.id === item.id
                                      ? item.unread === 3
                                        ? "bg-success text-white"
                                        : "bg-white text-black"
                                      : item.unread === 3
                                      ? "bg-success text-white"
                                      : "bg-black text-white"
                                  }`}
                                  style={{
                                    minWidth: "20px",
                                    height: "20px",
                                    fontSize: "0.7rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {item.unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Chat Interface */}
            <div className={`col-lg-8 col-md-7 d-flex flex-column my-lawyers-right-panel ${selectedContact ? 'col-12' : ''}`}>
              {selectedContact ? (
                // Chat Interface - Only show when contact is selected
                <>
                  {/* Conversation Header */}
                  <div
                    className="p-4 bg-white my-lawyers-conversation-header"
                    data-aos="fade-left"
                    data-aos-delay="100"
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        {/* Mobile Back Button */}
                        <button 
                          className="btn btn-sm d-lg-none me-3"
                          onClick={() => setSelectedContact(null)}
                        >
                          <i className="bi bi-arrow-left"></i>
                        </button>
                        <div className="symbol symbol-40px me-3">
                          <img
                            src={selectedContact.avatar}
                            alt={selectedContact.name}
                            className="rounded-circle my-lawyers-avatar-40"
                          />
                        </div>
                        <div>
                          <h6 className="mb-0 fw-bold text-dark">
                            {selectedContact.name}
                          </h6>
                          <small className="text-muted">
                            {activeTab === "chats"
                              ? "Lawyer"
                              : `${selectedContact.title || "Lawyer"}`}
                          </small>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm">
                          <i className="bi bi-search"></i>
                        </button>
                        <button className="btn btn-sm">
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div
                    className="flex-fill p-4 overflow-auto my-lawyers-messages-area"
                    data-aos="fade-left"
                    data-aos-delay="200"
                  >
                    {loadingMessages ? (
                      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "200px" }}>
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading messages...</span>
                        </div>
                      </div>
                    ) : (
                    <div className="d-flex flex-column gap-3">
                      {messages.map((message, index) => (
                        <div
                          key={message.id}
                          className={`d-flex ${
                            message.isFromUser
                              ? "justify-content-end"
                              : "justify-content-start"
                          }`}
                          data-aos="fade-up"
                          data-aos-delay={`${300 + index * 100}`}
                        >
                          <div
                            className={`d-flex align-items-end ${
                              message.isFromUser ? "flex-row-reverse" : ""
                            }`}
                          >
                            <div className="symbol symbol-30px mx-2">
                              <div className="symbol-label bg-black text-white rounded-circle">
                                <img
                                  src={
                                    message.isFromUser
                                      ? (userPicture || notificationProfile)
                                      : (currentChatData?.lawyer?.picture || selectedContact?.avatar || notificationProfile)
                                  }
                                  alt={message.isFromUser ? "User" : "Lawyer"}
                                  className="rounded-circle my-lawyers-avatar-30"
                                  onError={(e) => {
                                    e.target.src = notificationProfile;
                                  }}
                                />
                              </div>
                            </div>
                            <div
                              className={`p-3 my-lawyers-message-bubble ${
                                message.isFromUser
                                  ? "bg-dark text-white my-lawyers-message-bubble-outgoing"
                                  : "bg-white text-dark my-lawyers-message-bubble-incoming"
                              }`}
                            >
                              {message.text && <p className="mb-2">{message.text}</p>}
                              {message.file && (
                                <div className={`mb-2 ${message.isFromUser ? 'text-white' : 'text-dark'}`}>
                                  <a
                                    href={message.file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`d-inline-flex align-items-center gap-2 p-2 rounded ${
                                      message.isFromUser 
                                        ? 'bg-dark border border-white-50 text-white' 
                                        : 'bg-light text-dark'
                                    }`}
                                    style={{ textDecoration: 'none' }}
                                  >
                                    <i className={`bi ${
                                      message.file.type === 'image' ? 'bi-image' :
                                      message.file.type === 'video' ? 'bi-play-circle' :
                                      message.file.type === 'audio' ? 'bi-music-note-beamed' :
                                      'bi-file-earmark'
                                    }`}></i>
                                    <span className="small">{message.file.name}</span>
                                    <i className="bi bi-download"></i>
                                  </a>
                                </div>
                              )}
                              <small
                                className={`${
                                  message.isFromUser
                                    ? "text-white-50"
                                    : "text-muted"
                                }`}
                              >
                                {message.time}
                              </small>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div
                    className="p-3 p-lg-4 border-top bg-white rounded-3 shadow mx-2 mx-lg-5 my-lawyers-message-input"
                    data-aos="fade-left"
                    data-aos-delay="300"
                  >
                    {/* Selected File Display */}
                    {selectedFile && (
                      <div className="mb-2 p-2 bg-light rounded d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-file-earmark text-primary"></i>
                          <span className="small text-dark">{selectedFile.name}</span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-danger p-0"
                          onClick={handleRemoveFile}
                        >
                          <i className="bi bi-x-circle"></i>
                        </button>
                      </div>
                    )}
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                      <div className="flex-fill position-relative">
                        <input
                          type="text"
                          className="form-control form-control-lg rounded-pill"
                          placeholder="Write a Messages..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" && handleSendMessage()
                          }
                        />
                        <input
                          type="file"
                          ref={(el) => setFileInputRef(el)}
                          onChange={handleFileSelect}
                          className="d-none"
                          id="file-input-chat"
                          accept="*/*"
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm d-none d-md-block"
                        onClick={() => fileInputRef?.click()}
                        title="Attach file"
                      >
                        <i className="bi bi-paperclip"></i>
                      </button>
                      <button
                        className="btn btn-dark rounded-circle d-flex justify-content-center align-items-center my-lawyers-send-button"
                        onClick={handleSendMessage}
                        disabled={sendingMessage || (!newMessage.trim() && !selectedFile)}
                      >
                        {sendingMessage ? (
                          <div className="spinner-border spinner-border-sm text-white" role="status">
                            <span className="visually-hidden">Sending...</span>
                          </div>
                        ) : (
                          <i className="bi bi-send-fill text-white"></i>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                // Empty State - Show different content based on active tab
                <div
                  className="d-flex align-items-center justify-content-center h-100 bg-light"
                  data-aos="fade-left"
                  data-aos-delay="100"
                >
                  <div className="text-center p-5">
                    <div className="mb-4">
                      {activeTab === "chats" ? (
                        <img src={NoMessage} alt="No Message" style={{ maxWidth: "200px", height: "auto" }} />
                      ) : (
                        <img src={NoLawyer} alt="No Lawyer" style={{ maxWidth: "280px", width: "280px", height: "auto", filter: "grayscale(100%)" }} />
                      )}
                    </div>
                    {activeTab === "chats" ? (
                      <>
                        <h4 className="text-muted mb-2 fw-bold">No Messages, Yet.</h4>
                        <p className="text-muted mb-0">
                          You don't have any messages yet.
                        </p>
                      </>
                    ) : (
                      <>
                        <h4 className="text-muted mb-2 fw-bold">No Lawyers Hired</h4>
                        <p className="text-muted mb-0">
                          You haven't hired any lawyers yet.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default List;
