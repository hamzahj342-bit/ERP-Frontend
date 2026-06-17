import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Components/Login';
import Dashboard from './Components/Dashboard';
import ProtectedRoute from './Components/ProtectedRoute';
import ProductCard from './Components/ProductCard';
// import EntityForm from './Components/EntityForm';
import { ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Customers from './Pages/Customers';
import CustomerForm from './Components/CustomerForm';
import SupplierForm from './Components/SupplierForm';
import Suppliers from './Pages/Suppliers';
import PurchaseForm from './Components/PurchaseForm';
import SalesForm from './Components/SalesForm';
import TransactionHistory from './Pages/TransactionHistory';
import AddMaterial from './Pages/AddMaterial';
import RM_Purchase from './Pages/RM_Purchase';
import RM_PurchaseForm from './Pages/RM_PurchaseForm';
import RM_Sale from './Pages/RM_Sale';
import RM_SaleForm from './Pages/RM_SaleForm';
import RM_Return from './Pages/RM_Return';
import RM_ReturnForm from './Pages/RM_ReturnForm';
import Shops from './Pages/Shops';
import ShopForm from './Components/ShopForm';
import RM_SaleReturn from './Pages/RM_SaleReturn';
import RM_SaleReturnForm from './Pages/RM_SaleReturnForm';
import RMStockList from './Components/RMStockList';
import RM_InvoiceDetail from './Components/RM_InvoiceDetail';
import RM_Invoice from './Components/RM_Invoice';
import RecipeList from './Pages/RecipeList';
import AddRecipe from './Pages/AddRecipe';
import Profile from './Components/Profile';
import ProductionList from './Pages/ProductionList';
import ProductionForm from './Pages/ProductionForm';
import FP_SaleList from './Pages/FP_SaleList';
import FP_SaleForm from './Pages/FP_SaleForm';
import FP_SaleReturnList from './Pages/FP_SaleReturnList';
import FP_SaleReturnForm from './Pages/FP_SaleReturnForm';
import FP_InvoiceDetail from './Components/FP_InvoiceDetail';
import Employees from './Pages/Emloyees';
import EmployeesForm from './Components/EmployeesForm';
import CreateAccount from './Pages/CreateAccount';
import AccountList from './Pages/AccountList';
import PaymentTransactionForm from './Components/PaymentTransactionForm';
import PaymentTransactionList from './Components/PaymentTransctionList';
import PaymentTransactionInvoice from './Components/PaymentTransactionInvoice';
import InvestmentList from './Components/InvestmentList';
import InvestmentForm from './Components/InvestmentForm';
import AccountCategoryList from './Pages/AccountCategoryList';
import CreateAccountCategory from './Pages/CreateAccountCategory';
import RM_Transactions from './Layout/RM_Transactions';
import FP_Production from './Layout/FP_Production';
import FP_Transactions from './Layout/FP_Transactions';
import Accounts from './Layout/Accounts';
import Transactions from './Layout/Transactions';
import EntityLedgerReport from './Components/EntityLedgerReport';
import Reports from './Layout/Reports';
import ProfitLoss from './Components/ProfitLoss';
import AccountLedger from './Components/AccountsLedger';
import ProductBatchList from './Components/ProductBatchList';
import Finished_ProductList from './Pages/Finished_ProductList';
import MaterialsList from './Pages/MaterialsList';
import RM_Adjustment from './Components/RM_Adjustment';
import FP_Adjustment from './Components/FP_Adjustment';
import InventoryAdjustment from './Layout/InventoryAdjustment';
import SalesReport from './Reports/SalesReport';
import ProductionReport from './Reports/ProductionReport';
import CustomerInvoices from './Pages/CustomerInvoices';
import SupplierInvoices from './Pages/SupplierInvoices';
import StockReport from './Reports/StockReport';
import EntityBalanceReport from './Reports/EntityBalanceReport';
import CapitalReport from './Reports/CapitalReport';
import TrialBalanceReport from './Reports/TrialBalanceReport';
import SegmentedProfitLossReport from './Reports/Product_ProfitLoss';

const App = () => {
  return (
    <Router>
      
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/profile" element={<ProtectedRoute> <Profile /> </ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute> <Dashboard /> </ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><ProductCard /></ProtectedRoute>} />
        {/* <Route path="/entities" element={<ProtectedRoute> <EntityForm/> </ProtectedRoute>} /> */}
        <Route path="/customers" element={<ProtectedRoute> <Customers/> </ProtectedRoute>} />
        <Route path="/add-customers" element={<ProtectedRoute> <CustomerForm/> </ProtectedRoute>} />
        <Route path="/customer-invoices/:id" element={<ProtectedRoute> <CustomerInvoices/> </ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute> <Suppliers/> </ProtectedRoute>} />
        <Route path="/add-suppliers" element={<ProtectedRoute> <SupplierForm/> </ProtectedRoute>} />
        <Route path="/supplier-invoices/:id" element={<ProtectedRoute> <SupplierInvoices/> </ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute> <Employees /> </ProtectedRoute>} />
        <Route path="/add-employees" element={<ProtectedRoute> <EmployeesForm /> </ProtectedRoute>} />
        <Route path="/shops" element={<ProtectedRoute> <Shops/> </ProtectedRoute>} />
        <Route path="/add-shops" element={<ProtectedRoute> <ShopForm/> </ProtectedRoute>} />

        <Route path="/purchase" element={<ProtectedRoute> <PurchaseForm/> </ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute> <SalesForm/> </ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute> <TransactionHistory/> </ProtectedRoute>} />

        <Route path="/add-materials" element={<ProtectedRoute> <AddMaterial/> </ProtectedRoute>} />
        <Route path='/materials-list' element={<ProtectedRoute> <MaterialsList /> </ProtectedRoute>} />
        <Route path="/rm-purchase" element={<ProtectedRoute> <RM_Purchase/> </ProtectedRoute>} />
        <Route path="/rm-purchase-form" element={<ProtectedRoute> <RM_PurchaseForm/> </ProtectedRoute>} />
        <Route path="/rm-sale" element={<ProtectedRoute> <RM_Sale/> </ProtectedRoute>} />
        <Route path="/rm-sale-form" element={<ProtectedRoute> <RM_SaleForm/> </ProtectedRoute>} />
        <Route path="/rm-return" element={<ProtectedRoute> <RM_Return/> </ProtectedRoute>} />
        <Route path="/rm-return-form" element={<ProtectedRoute> <RM_ReturnForm/> </ProtectedRoute>} />
        <Route path="/rm-sale-return"element={<ProtectedRoute> <RM_SaleReturn/> </ProtectedRoute>} />
        <Route path="/rm-sale-return-form"element={<ProtectedRoute> <RM_SaleReturnForm/> </ProtectedRoute>} />
        <Route path="/rm-stock"element={<ProtectedRoute> <RMStockList/> </ProtectedRoute>} />
        <Route path="/rm-invoice-detail" element={<ProtectedRoute> <RM_InvoiceDetail/> </ProtectedRoute>} />
         <Route path="/rm-invoice/:invoiceNo" element={<ProtectedRoute> <RM_Invoice/> </ProtectedRoute>} />
         <Route path='/rm-adjustment' element={<ProtectedRoute> <RM_Adjustment /> </ProtectedRoute>} />

        <Route path="/recipe"element={<ProtectedRoute> <RecipeList/> </ProtectedRoute>} />
        <Route path="/add-recipe"element={<ProtectedRoute> <AddRecipe/> </ProtectedRoute>} />
        <Route path="/add-recipe/:id" element={<ProtectedRoute> <AddRecipe/> </ProtectedRoute>} />

       
        <Route path="/production" element={<ProtectedRoute> <ProductionList /> </ProtectedRoute>} />
        <Route path="/production-form" element={<ProtectedRoute> <ProductionForm /> </ProtectedRoute>} />
        <Route path="/fp-sale-list" element={<ProtectedRoute> <FP_SaleList /> </ProtectedRoute>} />
        <Route path="/fp-sale-form" element={<ProtectedRoute> <FP_SaleForm /> </ProtectedRoute>} />
        <Route path="/fp-salereturn-list" element={<ProtectedRoute> <FP_SaleReturnList /> </ProtectedRoute>} />
        <Route path="/fp-salereturn-form" element={<ProtectedRoute> <FP_SaleReturnForm /> </ProtectedRoute>} />
        <Route path="/fp-invoice-detail/:invoiceNo" element={<ProtectedRoute> <FP_InvoiceDetail /> </ProtectedRoute>} />
        <Route path="/product-batches" element={<ProtectedRoute> <ProductBatchList /> </ProtectedRoute>} />
        <Route path="/finished-products" element={<ProtectedRoute> <Finished_ProductList /> </ProtectedRoute>} />
        <Route path="/fp-adjustment" element={<ProtectedRoute> <FP_Adjustment /> </ProtectedRoute>} />
        
        <Route path="/account-categories" element={<ProtectedRoute> <AccountCategoryList/> </ProtectedRoute>} />
        <Route path="/create-category" element={<ProtectedRoute> <CreateAccountCategory /> </ProtectedRoute>} />
        <Route path="/accounts" element={<ProtectedRoute> <AccountList /> </ProtectedRoute>} />
        <Route path="/create-account" element={<ProtectedRoute> <CreateAccount /> </ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute> <PaymentTransactionForm /> </ProtectedRoute>} />
        <Route path="/payments-list" element={<ProtectedRoute> <PaymentTransactionList /> </ProtectedRoute>} />
        <Route path="/payment-transaction/:invoiceNo" element={<ProtectedRoute> <PaymentTransactionInvoice /> </ProtectedRoute>} />
        <Route path="/payment-transactions/:invoiceNo" element={<ProtectedRoute> <PaymentTransactionInvoice /> </ProtectedRoute>} />
        <Route path="/investment-list" element={<ProtectedRoute> <InvestmentList /> </ProtectedRoute>} />
        <Route path="/investment" element={<ProtectedRoute> <InvestmentForm /> </ProtectedRoute>} />


        <Route path='/rm-transactions' element={<ProtectedRoute> <RM_Transactions /> </ProtectedRoute>} />
        <Route path='/fp-production' element={<ProtectedRoute> <FP_Production /> </ProtectedRoute>} />
        <Route path='/fp-transactions' element={<ProtectedRoute> <FP_Transactions /> </ProtectedRoute>} />
        <Route path='/accounts-setting' element={<ProtectedRoute> <Accounts /> </ProtectedRoute>} />
        <Route path='/payment-transactions' element={<ProtectedRoute> <Transactions /> </ProtectedRoute>} />

        <Route path='/reports' element={<ProtectedRoute> <Reports /> </ProtectedRoute>} />
        <Route path='/entity-ledger' element={<ProtectedRoute> <EntityLedgerReport /> </ProtectedRoute>} />
        <Route path='/profit-loss' element={<ProtectedRoute> <ProfitLoss /> </ProtectedRoute>} />
        <Route path='/accounts-report' element={<ProtectedRoute> <AccountLedger /> </ProtectedRoute>} />
        <Route path='sales-report' element={<ProtectedRoute> <SalesReport /> </ProtectedRoute>} />
        <Route path='production-report' element={<ProtectedRoute> <ProductionReport /> </ProtectedRoute>} />
        <Route path='/inventory-adjustment' element={<ProtectedRoute > <InventoryAdjustment /> </ProtectedRoute>} /> 
        <Route path='/stock-report' element={<ProtectedRoute > <StockReport /> </ProtectedRoute>} /> 
        <Route path='/entity-balance-report' element={<ProtectedRoute > <EntityBalanceReport /> </ProtectedRoute>} />
        <Route path='/capital-report' element={<ProtectedRoute > <CapitalReport /> </ProtectedRoute>} />
        <Route path='/trial-balance' element={<ProtectedRoute > <TrialBalanceReport /> </ProtectedRoute>} />
        <Route path='/segmented-profit-loss' element={<ProtectedRoute > <SegmentedProfitLossReport /> </ProtectedRoute>} />
      </Routes>  
       <ToastContainer position="top-right" autoClose={3000} style={{ zIndex: 99999 }}/>
    </Router>
  );
};

export default App;
