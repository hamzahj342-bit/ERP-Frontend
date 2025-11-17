import NavigationBar from "../Components/NavigationBar";
import { useLocation } from "react-router-dom";

const MainLayout = ({ children }) => {
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";

  return (
    <>
      <NavigationBar />

      <div
        className="main-content"
        style={{
          marginLeft: isDashboard ? "260px" : "0px",
          transition: "0.3s ease"
        }}
      >
        {children}
      </div>
    </>
  );
};

export default MainLayout;
