import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import notificationProfile from "../../assets/images/notification-profile.png";
import NoMessage from "../../assets/images/NoMessage.png";
import ApiService from "../../services/ApiService";
import { toast } from "react-toastify";
import SocketService from "../../services/SocketService";
import { Link } from "react-router-dom";
import PaymentModal from "../../components/PaymentModal";


const formatMessageText = (text = "") => {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};
const userProfile = (() => {
  try {
    const userStr = localStorage.getItem("loggedUser");
    if (userStr && userStr !== "undefined" && userStr.startsWith("{")) {
      return JSON.parse(userStr);
    }
  } catch (e) {
    console.error("Error parsing loggedUser in Chat List", e);
  }
  return null;
})();


const List = () => {


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
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  // Set default tab based on route - "lawyers" for /my-lawyers, "chats" for /chat
  const getDefaultTab = () => {
    return location.pathname.includes('/my-lawyers') ? "lawyers" : "chats";
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [activeSubTab, setActiveSubTab] = useState("active");
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Update active tab when route changes
  useEffect(() => {
    const defaultTab = location.pathname.includes('/my-lawyers') ? "lawyers" : "chats";
    setActiveTab(defaultTab);
    // Clear selected contact when switching routes
    setSelectedContact(null);
    setSelectedChat(null);
  }, [location.pathname]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [chatContacts, setChatContacts] = useState([]);
  const [activeLawyers, setActiveLawyers] = useState([]);
  const [inactiveLawyers, setInactiveLawyers] = useState([]);
  const [loadingLawyers, setLoadingLawyers] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentData, setPaymentData] = useState({});

  const handlePayNow = (message) => {
    if (!message.invoice_data || !message.invoice_data.total_amount) {
      toast.error("Invalid invoice data");
      return;
    }
    
    setPaymentAmount(parseFloat(message.invoice_data.total_amount));
    setPaymentData({
      message_id: message.id,
      // You might want to pass other necessary data here
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (result) => {
    try {
      // Call InvoicePaid API
      const response = await ApiService.request({
        method: "POST",
        url: "invoicePaid",
        data: {
          message_id: result.message_id,
          transaction_id: result.paymentIntentId // Pass transaction ID from Stripe
        }
      });

      if (response.data.status) {
        toast.success(response.data.message || "Invoice paid successfully!");
        // Refresh messages to show updated status
        fetchChatMessages();
      } else {
        toast.error(response.data.message || "Failed to mark invoice as paid");
      }
    } catch (error) {
      console.error("Error confirming invoice payment:", error);
      toast.error("Failed to confirm payment");
    }
  };

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
              chatId: (service.chat && service.chat.id) ? service.chat.id : null, // Use chat ID if exists
              userServiceId: service.id, // Service ID for creating/finding chat
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
              chatId: (service.chat && service.chat.id) ? service.chat.id : null, // Use chat ID if exists
              userServiceId: service.id, // Service ID for creating/finding chat
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

  // Fetch chats from API using getChats - Only normal chats for Chats tab
  useEffect(() => {
    const fetchChats = async () => {
      if (activeTab !== "chats") return;
      
      try {
        setLoading(true);
        
        // Only fetch normal chats (not service chats)
        const normalResponse = await ApiService.request({
          method: "GET",
          url: "getChats",
          data: { type: "normal" }
        });
        
        if (normalResponse.data.status && normalResponse.data.data && normalResponse.data.data.chats) {
          const normalChats = normalResponse.data.data.chats;
          
          if (normalChats.length > 0) {
            // Sort by latest message time
            normalChats.sort((a, b) => {
              const timeA = a.latest_message_time ? new Date(a.latest_message_time).getTime() : 0;
              const timeB = b.latest_message_time ? new Date(b.latest_message_time).getTime() : 0;
              return timeB - timeA;
            });
            
            // Transform API data to match component format
            const transformedChats = normalChats.map((chat) => {
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
                lastMessage: chat.last_message?.message || "", // Will be updated when we fetch messages
                time: lastMessageTime,
                unread: chat.unread_count || 0, // Will be updated when we fetch messages
                avatar: lawyer.picture || notificationProfile,
                userService: chat.user_service,
                type: chat.type || "normal",
                rawData: chat,
              };
            });
            
            setChatContacts(transformedChats);
            
            // Automatically select the first chat if none is selected
            if (transformedChats.length > 0 && !selectedChat) {
              setSelectedChat(transformedChats[0]);
              setSelectedContact(transformedChats[0]);
            }
          } else {
            setChatContacts([]);
          }
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

  // Fetch messages function
  const fetchChatMessages = useCallback(async () => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    try {
      setLoadingMessages(true);
      
      // Prepare request data based on chat type
      let requestData = {};
      
      // If chatId exists, use it (for existing chats)
      if (selectedChat.chatId) {
        requestData.chat_id = selectedChat.chatId;
      } 
      // If userServiceId exists (from My Lawyers tab), use it for service chats
      else if (selectedChat.userServiceId) {
        requestData.user_service_id = selectedChat.userServiceId;
      }
      // Otherwise, use lawyer_id for normal chats
      else if (selectedChat.lawyerId) {
        requestData.lawyer_id = selectedChat.lawyerId;
      }
      // If none are available, show error
      else {
        toast.error("Unable to load chat. Missing chat information.");
        setLoadingMessages(false);
        return;
      }
      
      const response = await ApiService.request({
        method: "GET",
        url: "getChatMessages",
        data: requestData
      });
      
      const data = response.data;
      if (data.status && data.data && data.data.messages) {
        // Transform API messages to match component format
        const transformedMessages = data.data.messages.map((msg) => {
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
            invoice_data: msg.invoice_data || null,
            time: messageTime,
            isFromUser: msg.sender === "user",
            sender: msg.sender,
            created_at: msg.created_at,
            file: msg.file || null,
            file_type: msg.file_type || null,
            file_name: msg.file ? msg.file.split('/').pop() : null,
            rawData: msg,
          };
        });
        
        // Reverse messages to show oldest first (API returns latest first)
        const reversedMessages = transformedMessages.reverse();
        setMessages(reversedMessages);
        
        // Update last message and unread count in chat contacts
        if (reversedMessages.length > 0) {
          const lastMsg = reversedMessages[reversedMessages.length - 1];
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
  }, [selectedChat]);

  // Fetch messages when chat is selected
  useEffect(() => {
    fetchChatMessages();
  }, [fetchChatMessages]);

  // Socket listener for new messages
  useEffect(() => {
    // Ensure socket is connected
    if (!SocketService.checkConnection()) {
      SocketService.connect();
    }

    const unsubscribe = SocketService.subscribe("receive-message", (data) => {
      console.log("New message received via socket:", data);
      
      if (!selectedChat) return;

      // Check if message belongs to current chat
      // Support both normal chats (chat_id) and service chats (user_service_id)
      const isCurrentChat = 
        (selectedChat.chatId && parseInt(data.chat_id) === parseInt(selectedChat.chatId)) ||
        (selectedChat.userServiceId && parseInt(data.user_service_id) === parseInt(selectedChat.userServiceId));

      if (!isCurrentChat) {
        // If not current chat, just update unread count in sidebar (optional)
        return;
      }

      // Transform the new message
      const messageTime = data.created_at 
        ? new Date(data.created_at).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })
        : new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });

      const newMessage = {
        id: data.id || Date.now(),
        text: data.message || "",
        invoice_data: data.invoice_data || null, // Ensure invoice data is included
        time: messageTime,
        isFromUser: data.sender === "user",
        sender: data.sender,
        created_at: data.created_at || new Date().toISOString(),
        file: data.file || null,
        file_type: data.file_type || null,
        file_name: data.file ? data.file.split('/').pop() : null,
        rawData: data,
      };

      // Append to messages
      setMessages((prevMessages) => {
        // Prevent duplicate messages
        if (prevMessages.some(msg => msg.id === newMessage.id)) {
          return prevMessages;
        }
        return [...prevMessages, newMessage];
      });
      
      // Update last message in sidebar
      setChatContacts(prev => prev.map(chat => 
        chat.chatId === selectedChat.chatId
          ? { 
              ...chat, 
              lastMessage: newMessage.text || (newMessage.file ? `📎 ${newMessage.file_name}` : ''), 
              time: newMessage.time,
              unread: 0
            }
          : chat
      ));
      
      // Mark as read
      try {
        ApiService.request({
          method: "POST",
          url: "readChatMessages",
          data: { chat_id: selectedChat.chatId }
        });
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    });
    return unsubscribe;
  }, [selectedChat]);

  // Listen for invoice-paid event
  useEffect(() => {
    const unsubscribe = SocketService.subscribe("invoice-paid", (data) => {
      console.log("Invoice paid event received:", data);
      
      if (!selectedChat) return;

      // Check if message belongs to current chat
      const isCurrentChat = 
        (selectedChat.chatId && parseInt(data.chat_id) === parseInt(selectedChat.chatId));

      if (!isCurrentChat) return;

      // Update the specific message in the list
      setMessages(prevMessages => prevMessages.map(msg => {
        if (parseInt(msg.id) === parseInt(data.message_id)) {
          return {
            ...msg,
            invoice_data: {
              ...msg.invoice_data,
              pay_status: 'Paid',
              task_status: 'In Progress' // Usually starts as In Progress after payment
            }
          };
        }
        return msg;
      }));
    });
    return unsubscribe;
  }, [selectedChat]);
  // Scroll to bottom when messages change or when loading completes
  useEffect(() => {
    if (!loadingMessages && messages.length > 0) {
      // Use setTimeout to ensure DOM is updated before scrolling
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "auto" });
        } else if (messagesContainerRef.current) {
          // Fallback: scroll the container to bottom
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 150);
    }
  }, [messages, loadingMessages]);

  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    setSelectedChat(contact);
  };

  // Determine file type based on file extension
  const getFileType = (fileName) => {
    if (!fileName) return '';
    const ext = fileName.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'];
    
    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    return 'doc';
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    setSelectedFile(file);
    
    // Create preview for images
    const fileType = getFileType(file.name);
    if (fileType === 'image') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedChat) return;

    const messageText = newMessage.trim();
    const fileToSend = selectedFile;
    const fileType = fileToSend ? getFileType(fileToSend.name) : '';
    
    // Clear inputs
    setNewMessage("");
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      text: formatMessageText(messageText) || (fileToSend ? `Sending ${fileToSend.name}...` : ''),
      time: currentTime,
      isFromUser: true,
      sender: "user",
      isPending: true,
      file: fileToSend ? URL.createObjectURL(fileToSend) : null,
      file_type: fileType,
      file_name: fileToSend ? fileToSend.name : null,
    };
    
    setMessages(prev => [...prev, tempMsg]);
    
    // Scroll to bottom when adding temp message
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      } else if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 50);

    try {
      // Prepare FormData if file is present
      let requestData;
      
      if (fileToSend) {
        const formData = new FormData();
        formData.append('file', fileToSend);
        formData.append('file_type', fileType);
        if (messageText) {
          formData.append('message', messageText);
        }
        if (selectedChat.chatId) {
          formData.append('chat_id', selectedChat.chatId);
        }
        requestData = formData;
      } else {
        requestData = {
          chat_id: selectedChat.chatId,
          message: messageText,
        };
      }

      const response = await ApiService.request({
        method: "POST",
        url: "sendMessage",
        data: requestData
      });

      const data = response.data;
      if (data.status && data.data) {
        // console.log(selectedChat);
        SocketService.emit('send-message', data.data, selectedChat?.rawData?.chat);
        // Replace temp message with actual message from API
        const actualMsg = {
          id: data.data.id,
          text: formatMessageText(data.data.message || messageText || (fileToSend ? fileToSend.name : '')),
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
          file: data.data.file || null,
          file_type: data.data.file_type || null,
          file_name: fileToSend ? fileToSend.name : null,
          rawData: data.data,
        };
        
        setMessages(prev => prev.map(msg => 
          msg.id === tempMsg.id ? actualMsg : msg
        ));
        
        // Clean up object URL
        if (tempMsg.file) {
          URL.revokeObjectURL(tempMsg.file);
        }
        
        // Scroll to bottom after message is added
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
          } else if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 100);
        
        // Update last message in chat contacts
        const lastMessageText = actualMsg.text || (fileToSend ? `📎 ${fileToSend.name}` : '');
        setChatContacts(prev => prev.map(chat => 
          chat.chatId === selectedChat.chatId
            ? { ...chat, lastMessage: lastMessageText, time: actualMsg.time }
            : chat
        ));
      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempMsg.id));
        toast.error(data.message || "Failed to send message");
        setNewMessage(messageText); // Restore message text
        if (fileToSend) {
          setSelectedFile(fileToSend);
          if (fileType === 'image') {
            const reader = new FileReader();
            reader.onloadend = () => {
              setFilePreview(reader.result);
            };
            reader.readAsDataURL(fileToSend);
          }
        }
        // Clean up object URL
        if (tempMsg.file) {
          URL.revokeObjectURL(tempMsg.file);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMsg.id));
      toast.error("Failed to send message. Please try again.");
      setNewMessage(messageText); // Restore message text
      if (fileToSend) {
        setSelectedFile(fileToSend);
        if (fileType === 'image') {
          const reader = new FileReader();
          reader.onloadend = () => {
            setFilePreview(reader.result);
          };
          reader.readAsDataURL(fileToSend);
        }
      }
      // Clean up object URL
      if (tempMsg.file) {
        URL.revokeObjectURL(tempMsg.file);
      }
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
    <div className="d-flex flex-column flex-column-fluid my-lawyers-page my-lawyers-main-container dashboard--inter-font">
      <div id="kt_app_content" className="app-content flex-column-fluid pb-0">
        <div
          id="kt_app_content_container"
          className="app-container container-xxl h-100 px-0 mx-0"
        >
          <div className="row h-100 g-0" data-aos="fade-up">
            {/* Left Panel - Contact List */}
            <div className={`col-lg-4 col-md-5 ${selectedContact ? 'd-none d-lg-block' : ''}`}>
              <div className="d-flex flex-column h-100 my-lawyers-left-panel">
                {/* Main Tabs */}
                <div className="py-4">
                  <div className="d-flex gap-2 my-lawyers-tabs-container">
                    <button
                      className={`btn flex-fill d-flex align-items-center justify-content-center gap-2 portal-tab-hover my-lawyers-main-tab ${
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
                      className={`btn flex-fill d-flex align-items-center justify-content-center gap-2 portal-tab-hover my-lawyers-main-tab ${
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
                  <div className="px-4 pb-3">
                    <div className="d-flex gap-2">
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
                  <div className="p-4">
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
                      className={`p-3 cursor-pointer mb-3 my-lawyers-contact-card portal-card-hover ${
                        selectedContact?.chatId === item.chatId || selectedContact?.id === item.id
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
                              <h6 className="mb-1 fw-bold text-dark chat-lawyer-name">
                                {item.name}
                              </h6>
                              <p className="text-muted mb-1 fs-7">
                                {item.title}
                              </p>
                              <p className="text-muted mb-2 fs-8 d-none d-md-block">
                                {item.specializations}
                              </p>
                              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                                <small className="text-muted mb-1 mb-md-0">
                                  {item.renewalDate}
                                </small>
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-bold text-dark chat-lawyer-price">
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
                              <h6 className="mb-0 fw-bold text-dark text-truncate me-2 my-lawyers-name-truncate chat-contact-name">
                                {item.name}
                              </h6>
                              <small className="text-muted fs-8 chat-contact-time">
                                {item.time}
                              </small>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                              <p
                                className="text-muted mb-0 fs-7 my-lawyers-message-text flex-fill me-2"
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
                                  className={`badge rounded-pill my-lawyers-chat-unread-badge chat-contact-badge ${
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
                  <div className="p-4 bg-white my-lawyers-conversation-header">
                    <div className="d-flex justify-content-between align-items-center">
                      <Link to={`/lawyers?id=${selectedContact.lawyerId}`} className="text-decoration-none">
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
                      </Link>
                      {/* <div className="d-flex gap-2">
                        <button className="btn btn-sm">
                          <i className="bi bi-search"></i>
                        </button>
                        <button className="btn btn-sm">
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                      </div> */}

                    </div>
                  </div>

                  {/* Messages Area */}
                  <div 
                    ref={messagesContainerRef}
                    className="flex-fill p-4 overflow-auto my-lawyers-messages-area"
                  >
                    {loadingMessages ? (
                      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "200px" }}>
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading messages...</span>
                        </div>
                      </div>
                    ) : (
                    <div className="d-flex flex-column gap-3">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`d-flex ${
                            message.isFromUser
                              ? "justify-content-end"
                              : "justify-content-start"
                          }`}
                        >
                          <div
                            className={`d-flex align-items-end ${
                              message.isFromUser ? "flex-row-reverse" : ""
                            }`}
                          >
                            <div className="symbol symbol-30px mx-2">
                              <div className="symbol-label bg-black text-white rounded-circle">
                                <img
                                  src={message.isFromUser ? userProfile?.picture : selectedContact.avatar || notificationProfile}
                                  alt="avatar"
                                  className="rounded-circle my-lawyers-avatar-30"
                                />
                              </div>
                            </div>
                            <div
                              className={`p-3 rounded-3 my-lawyers-message-bubble ${
                                message.isFromUser
                                  ? "bg-dark text-white"
                                  : "bg-white text-dark"
                              }`}
                            >
                              {/* Display file if present */}
                              {message.file && (
                                <div className="mb-2">
                                  {message.file_type === 'image' ? (
                                    <a href={message.file} target="_blank" rel="noopener noreferrer" className="d-block">
                                      <img 
                                        src={message.file} 
                                        alt={message.file_name || 'Image'} 
                                        style={{ 
                                          maxWidth: '100%', 
                                          maxHeight: '250px', 
                                          borderRadius: '8px',
                                          objectFit: 'cover',
                                          cursor: 'pointer'
                                        }} 
                                      />
                                    </a>
                                  ) : message.file_type === 'video' ? (
                                    <div>
                                      <video 
                                        controls 
                                        style={{ 
                                          maxWidth: '300px', 
                                          maxHeight: '300px',
                                          borderRadius: '8px'
                                        }}
                                      >
                                        <source src={message.file} />
                                        Your browser does not support the video tag.
                                      </video>
                                    </div>
                                  ) : message.file_type === 'audio' ? (
                                    <div>
                                      <audio controls style={{ width: '100%', maxWidth: '300px' }}>
                                        <source src={message.file} />
                                        Your browser does not support the audio tag.
                                      </audio>
                                    </div>
                                  ) : (
                                    <a 
                                      href={message.file} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className={`d-flex align-items-center gap-2 text-decoration-none ${
                                        message.isFromUser ? 'text-white' : 'text-dark'
                                      }`}
                                      style={{ 
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        backgroundColor: message.isFromUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                                      }}
                                    >
                                      <i className="bi bi-file-earmark fs-4"></i>
                                      <span className="text-truncate" style={{ maxWidth: '200px' }}>
                                        {message.file_name || 'Document'}
                                      </span>
                                      <i className="bi bi-download ms-auto"></i>
                                    </a>
                                  )}
                                </div>
                              )}
                              {/* Display message text if present */}
                              {message.text && (
                                <p className="mb-0">{message.text}</p>
                              )}
                              {message.invoice_data && (
                                <div className="mb-2">
                                  <h6 className="mb-0">{message.invoice_data['items'][0].title ?? '--'}</h6>
                                  <hr />
                                  <h6 className="mb-2">Total: ${message.invoice_data['total_amount'] ?? '--'}</h6>
                                  {message.invoice_data.pay_status=='Pending' ? (
                                    <button 
                                      className="btn btn-sm btn-success"
                                      onClick={() => handlePayNow(message)}
                                    >
                                      Pay Now
                                    </button>
                                  ):(
                                    <>
                                      <span className="badge bg-light-success text-success">Paid</span> <br />
                                      <span className="text-dark">Task Status: {message.invoice_data.task_status}</span>
                                    </>
                                  )}
                                </div>
                              )}
                              <small
                                className={`d-block mt-1 ${
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
                  <div className="p-3 p-lg-4 border-top bg-white rounded-3 shadow mx-2 mx-lg-5 my-lawyers-message-input">
                    {/* File Preview */}
                    {selectedFile && (
                      <div className="mb-3 p-2 bg-light rounded d-flex align-items-center gap-2">
                        {filePreview ? (
                          <img 
                            src={filePreview} 
                            alt="Preview" 
                            style={{ 
                              width: '50px', 
                              height: '50px', 
                              objectFit: 'cover',
                              borderRadius: '6px'
                            }} 
                          />
                        ) : (
                          <div className="d-flex align-items-center justify-content-center bg-secondary text-white rounded" 
                            style={{ width: '50px', height: '50px' }}>
                            <i className="bi bi-file-earmark fs-4"></i>
                          </div>
                        )}
                        <div className="flex-fill">
                          <small className="d-block text-truncate fw-bold" style={{ maxWidth: '200px' }}>
                            {selectedFile.name}
                          </small>
                          <small className="text-muted">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </small>
                        </div>
                        <button 
                          className="btn btn-sm btn-link text-danger p-0"
                          onClick={handleRemoveFile}
                          type="button"
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </div>
                    )}
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                      <div className="flex-fill">
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
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="d-none"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                      />
                      <button 
                        className="btn btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                        title="Attach file"
                      >
                        <i className="bi bi-paperclip"></i>
                      </button>
                      <button
                        className="btn rounded-circle btn-dark text-center my-lawyers-send-button p-1"
                        onClick={handleSendMessage}
                        disabled={sendingMessage || (!newMessage.trim() && !selectedFile)}
                      >
                        {sendingMessage ? (
                          <div className="spinner-border spinner-border-sm text-white" role="status">
                            <span className="visually-hidden">Sending...</span>
                          </div>
                        ) : (
                          <i className="bi bi-send text-white"></i>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                // Empty State - Only show when no contact is selected
                <div className="d-flex align-items-center justify-content-center h-100 bg-light">
                  <div className="text-center p-5">
                    <div className="mb-4">
                      <img src={NoMessage} alt="No Message" style={{ maxWidth: "200px", height: "auto" }} />
                    </div>
                    <h4 className="text-muted mb-2 fw-bold">No Messages, Yet.</h4>
                    <p className="text-muted mb-0">
                      You don't have any messages yet.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Modal */}
      <PaymentModal
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={paymentAmount}
        onSuccess={handlePaymentSuccess}
        title="Pay Invoice"
        saveCard={true}
        paymentType="invoice" // Use a type that backend supports for initialization (might need adjustment if backend only supports 'question' or 'service')
        paymentData={paymentData}
      />
    </div>
  );
};

export default List;
