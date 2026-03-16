import {currentPage, session} from './lib/state.js'
import {LoginPage} from './components/LoginPage.jsx'
import {Layout} from './components/Layout.jsx'
import {MobileMoreMenu} from './components/NavBar.jsx'
import {Dashboard} from './components/Dashboard.jsx'
import {AccountList} from './components/AccountList.jsx'
import {CategoryList} from './components/CategoryList.jsx'
import {TransactionList} from './components/TransactionList.jsx'
import {PayeeList} from './components/PayeeList.jsx'
import {TransferList} from './components/TransferList.jsx'
import {CsvExportPage} from './components/CsvExportPage.jsx'
import {CsvImportPage} from './components/CsvImportPage.jsx'

function Page() {
  switch (currentPage.value) {
    case 'dashboard':
      return <Dashboard/>
    case 'banks':
      return <AccountList/> /* redirects to consolidated page */
    case 'accounts':
      return <AccountList/>
    case 'categories':
      return <CategoryList/>
    case 'payees':
      return <PayeeList/>
    case 'transactions':
      return <TransactionList/>
    case 'transfers':
      return <TransferList/>
    case 'csv-export':
      return <CsvExportPage/>
    case 'csv-import':
      return <CsvImportPage/>
    case '_more':
      return <MobileMoreMenu/>
    default:
      return <Dashboard/>
  }
}

export function App() {
  if (!session.value) return <LoginPage/>

  return (
    <Layout>
      <Page/>
    </Layout>
  )
}
