import { useEffect } from "react";
import { ReloadOutlined,MobileOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import PropTypes from "prop-types";
import { useState } from "react";
import { ToastContainer } from "react-toastify";

import CustomToast from "components/Common/Toast";

//redux
import withRouter from "components/Common/withRouter";
import { Link, useNavigate, useLocation } from "react-router-dom";

// Note: Replaced Formik with Ant Design form validation

// import css
import "../../assets/scss/_login.scss";
// import images
import logo from "assets/images/login-logo.png";
 
import { GET, POST } from "../../helpers/api_helper";
import { setUser } from "../../helpers/jwt-token-access/accessToken";
import { LOGIN_URL, USERS } from "../../helpers/url_helper";

const { Title } = Typography;

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  //meta title
  document.title = "Login | Finance";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasFormValues, setHasFormValues] = useState(false);
   const [deviceId, setDeviceId] = useState(null);
  const [showDeviceId, setShowDeviceId] = useState(false);
  const [isAndroidWebView, setIsAndroidWebView] = useState(false);

  const dummyUserData = {
    id: 1,
    username: "testuser",
    email: "test@example.com", 
    mobile_number: "9876543210",
    role: "Admin",
    allow_transaction: true,
    selected_columns: {},
    address: "123 Test Street, Test City",
    pin_code: 123456,
    full_name: "Test User",
    created_by: "admin",
    last_updated_by: "admin",
    created_ts: "2024-01-01T00:00:00Z",
    last_updated_ts: "2024-01-01T00:00:00Z",
    employees: [
      {
        id: 1,
        user: 1,
        branch: 1,
        line: 1,
        area: 1,
        branch_name: "Main Branch",
        line_name: "Test Line",
        area_name: "Test Area",
        created_by: "admin",
        last_updated_by: "admin"
      }
    ],
    user_expenses: [],
    investment_expense_mappings: [],
    line_wise_investment_expenses: []
  };
   // Get Android Device ID from Flutter
   useEffect(() => {
  const isWebView = detectAndroidWebView();
  setIsAndroidWebView(isWebView);
  
  // Only get device ID if in WebView
  if (!isWebView) {
    console.log('Browser detected - device ID will not be sent');
    return;
  }
  
  // Get device ID from window object
  if (window.ANDROID_DEVICE_ID) {
    setDeviceId(window.ANDROID_DEVICE_ID);
  }
}, []);
  useEffect(() => {
    const getDeviceId = () => {
      // Try to get from window object (injected by Flutter)
      if (window.ANDROID_DEVICE_ID) {
        setDeviceId(window.ANDROID_DEVICE_ID);
        console.log('Device ID loaded:', window.ANDROID_DEVICE_ID);
      } else {
        // Retry after a short delay if not available yet
        setTimeout(() => {
          if (window.ANDROID_DEVICE_ID) {
            setDeviceId(window.ANDROID_DEVICE_ID);
            console.log('Device ID loaded (retry):', window.ANDROID_DEVICE_ID);
          }
        }, 1000);
      }
    };

    getDeviceId();
  }, []);
    const handleShowDeviceId = () => {
    setShowDeviceId(true);
    
    // Hide after 10 seconds
    setTimeout(() => {
      setShowDeviceId(false);
    }, 10000);
  };
  const detectAndroidWebView = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // Method 1: Check custom User-Agent
  if (userAgent.includes('TMFAndroidApp')) {
    return true;
  }
  
  // Method 2: Check injected flag
  if (window.IS_ANDROID_WEBVIEW) {
    return true;
  }
  
  // Method 3: Check Android WebView patterns
  const isAndroid = /Android/i.test(userAgent);
  const isWebView = /wv|WebView/i.test(userAgent);
  
  return isAndroid && isWebView;
};
  

  const onFinish = async (values) => {
    setLoading(true);
     const loginPayload = isAndroidWebView && deviceId
  ? { ...values, device_id: deviceId }  // Android WebView
  : values;                 

    var res = await POST(LOGIN_URL, loginPayload);
    if(res.status === 200){
      localStorage.setItem("access_token", res.data.access);
      setLoading(false);
      setError('');
      get_user(res.data.access)
     
    }
    else if(res.status === 401){
    CustomToast(res.data.detail, "error");
    setLoading(false);

    }
    else{
    setLoading(false);
    CustomToast("Internal Server Error", "error");
    
  }
  };

  const handleFormChange = (changedValues, allValues) => {
    const hasValues = Object.values(allValues).some(value => 
      value !== undefined && value !== null && value !== ""
    );
    setHasFormValues(hasValues);
  };

  const handleReset = () => {
    form.resetFields();
    setHasFormValues(false);
    setError('');
  };
  
  const get_user = async(token)=>{
    if(token){
      try {
        // Fetch user details from /users/me endpoint
        const userResponse = await GET(`${USERS}me/`);
        
        if(userResponse.status === 200){
          // Store user details using setUser method
          setUser(userResponse.data);
          localStorage.setItem("user_role", userResponse.data.role);
        } else {
          setUser(dummyUserData);
        }
        setLoading(false);
        
        // Check for Flutter deep link redirect first (from URL params)
        const params = new URLSearchParams(window.location.search);
        const flutterRedirect = params.get("redirect");

        if (flutterRedirect) {
          // Go to Flutter deep link
          window.location.href = flutterRedirect;
          return;
        }

        // Check for internal app redirect (from React Router state)
        const from = location.state?.from?.pathname;
        
        if (from && from !== "/login") {
          // Redirect to the page user was trying to access
          navigate(from, { replace: true });
        } else {
          // Default redirect to branch list
          navigate("/branch/list", { replace: true });
        }

      } catch (error) {
        setUser(dummyUserData);
        setLoading(false);
        navigate('/view');
      }
    } else {
      setLoading(false);
      CustomToast("Internal Server Error", "error");
    }
  }

  
  return (
    <>
      <div 
        style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '20px',
          backgroundColor: '#f5f5f5'
        }}
      >
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <Card 
            className="overflow-hidden"
            style={{ 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              borderRadius: '8px'
            }}
          >
                <div className="bg-primary bg-soft" style={{ backgroundColor: '#556ee640', padding: '20px', textAlign: 'center' }}>
                  <Title level={4} style={{ color: '#556ee6', margin: 0 }}>Welcome Back To TMF!</Title>
                  <p style={{ margin: '8px 0 0 0' }}>Sign In</p>
                </div>
                
                <div style={{ padding: '24px' }}>
                  <div className="auth-logo" style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <Link to="/">
                      <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '50%', 
                        backgroundColor: '#f8f9fa', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        marginBottom: '16px'
                      }}>
                        <img
                          src={logo}
                          alt=""
                          style={{ borderRadius: '50%', height: '57px' }}
                        />
                      </div>
                    </Link>
                  </div>
                  
                  {error && (
                    <Alert
                      message={error}
                      type="error"
                      style={{ marginBottom: '16px' }}
                      showIcon
                    />
                  )}

                  <Form
                    form={form}
                    name="login"
                    onFinish={onFinish}
                    onValuesChange={handleFormChange}
                    layout="vertical"
                    requiredMark={false}
                  >
                    <Form.Item
                      name="username"
                      label="Email/Login ID"
                      rules={[
                        {
                          required: true,
                          message: 'Please Enter your Email / Login Id',
                        },
                      ]}
                    >
                      <Input 
                        placeholder="Enter LoginId"
                        size="large"
                      />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      label="Password"
                      rules={[
                        {
                          required: true,
                          message: 'Please Enter Your Password',
                        },
                      ]}
                    >
                      <Input.Password 
                        placeholder="Enter Password"
                        size="large"
                      />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          size="large"
                          style={{ 
                            height: '48px',
                            fontSize: '16px',
                            fontWeight: '500',
                            flex: 1
                          }}
                        >
                          {loading ? 'Loading...' : 'Log In'}
                        </Button>
                        {hasFormValues && (
                          <Button
                            type="default"
                            danger
                            icon={<ReloadOutlined />}
                            onClick={handleReset}
                            size="large"
                            style={{ 
                              height: '48px',
                              width: '48px'
                            }}
                            title="Reset Form"
                          />
                        )}
                      </div>

  {/* Device ID Button - Below Login Button */}
  {isAndroidWebView && deviceId && (
  <Button
    icon={<MobileOutlined />}
    onClick={handleShowDeviceId}
    size="large"
    block
    style={{
      height: '48px',
      fontSize: '16px',
      fontWeight: '500',
      backgroundColor: showDeviceId ? '#fff' : '#1677ff',
      color: showDeviceId ? '#000' : '#fff',
      border: showDeviceId ? '1px solid #d9d9d9' : 'none',
      transition: 'all 0.3s ease'
    }}
  >
    {showDeviceId 
      ? `Device-ID : ${deviceId || 'Unknown'}` 
      : 'Show Device-ID'
    }
  </Button>
  )}
                    </Form.Item>
                    
                  </Form>
                </div>
              </Card>
              
          
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <p style={{ color: '#6c757d' }}>
              © {new Date().getFullYear()} - THINKTANK
            </p>
          </div>
        </div>
      </div>
      
      <ToastContainer/>
    </>
  );
};

export default withRouter(Login);

Login.propTypes = {
  history: PropTypes.object,
};