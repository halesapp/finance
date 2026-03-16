import { session, currentPage } from './lib/state.js'
import { LoginPage } from './components/LoginPage.jsx'
import { Layout } from './components/Layout.jsx'
import { MobileMoreMenu } from './components/NavBar.jsx'
import { Dashboard } from './components/Dashboard.jsx'
import { BankList } from './components/BankList.jsx'
import { AccountList } from './components/AccountList.jsx'
import { CategoryList } from './components/CategoryList.jsx'
import { TransactionList } from './components/TransactionList.jsx'
import { TransferList } from './components/TransferList.jsx'
import { BalancesPage } from './components/BalancesPage.jsx'
import { CsvExportPage } from './components/CsvExportPage.jsx'
import { CsvImportPage } from './components/CsvImportPage.jsx'

function Page() {
  switch (currentPage.value) {
    case 'dashboard': return <Dashboard />
    case 'banks': return <BankList />
    case 'accounts': return <AccountList />
    case 'categories': return <CategoryList />
    case 'transactions': return <TransactionList />
    case 'transfers': return <TransferList />
    case 'balances': return <BalancesPage />
    case 'csv-export': return <CsvExportPage />
    case 'csv-import': return <CsvImportPage />
    case '_more': return <MobileMoreMenu />
    default: return <Dashboard />
  }
}

export function App() {
  if (!session.value) return <LoginPage />

  return (
    <Layout>
      <Page />
    </Layout>
  )
}
