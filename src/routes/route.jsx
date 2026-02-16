import React from "react";
import { Navigate, useLocation  } from "react-router-dom";
import { isTokenExpired,  unsetToken } from "../helpers/jwt-token-access/accessToken";

function Authmiddleware(props){
  const location = useLocation();
  if (isTokenExpired()) {
    unsetToken();
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }
  
  return (<React.Fragment>
    {props.children}
  </React.Fragment>);
};

export default Authmiddleware;
// import React from "react";
// import { Navigate, useLocation } from "react-router-dom";
// import { isTokenExpired, unsetToken } from "../helpers/jwt-token-access/accessToken";

// // ⚠️ DEVELOPMENT MODE - Server is down
// // Set this to true to bypass authentication checks
// const BYPASS_AUTH = true;

// function Authmiddleware(props) {
//   const location = useLocation();

//   // BYPASS AUTHENTICATION FOR DEVELOPMENT
//   if (BYPASS_AUTH) {
//     console.log("⚠️ AUTH BYPASS ACTIVE - Development Mode");
//     return <React.Fragment>{props.children}</React.Fragment>;
//   }

//   // NORMAL AUTHENTICATION FLOW (when server is up)
//   if (isTokenExpired()) {
//     unsetToken();
//     return <Navigate to="/login" state={{ from: location }} replace />;
//   }

//   return <React.Fragment>{props.children}</React.Fragment>;
// }

// export default Authmiddleware;