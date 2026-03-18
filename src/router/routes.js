// routes.js
import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login';

import CompanyList from '../pages/PostQuestion/List';

import PostList from '../pages/posts/List.jsx';

import CategoryList from '../pages/categories/List';

import BusinessTypeList from '../pages/business_types/List';

import ServiceList from '../pages/services/List';

import SkillList from '../pages/skills/List';

import BannerList from '../pages/banners/List';

import LawyersList from '../pages/Lawyers/List.jsx';

import MyCasesList from '../pages/MyCases/List.jsx';
import MyCasesDetails from '../pages/MyCases/Details.jsx';
import NotificationsList from '../pages/Notifications/List.jsx';

import SystemUserList from '../pages/system_users/List';

import ItemList from '../pages/items/List';

import AddonList from '../pages/addons/List';

import UserList from '../pages/Chat/List.jsx';

import Account from '../pages/Account';
import NotFound from '../pages/NotFound'; 
import CheckoutForm from '../pages/CheckoutForm'; 
import Setting from '../pages/Setting';

import WebsiteList from '../pages/websites/List';

import EmployeesList from '../pages/Employees/List';
import EmployeeDetails from '../pages/Employees/Details';
import HelpSupport from '../pages/HelpSupport/List';
import TrackMyTicket from '../pages/TrackMyTicket/List';


const routes = [
    {
        path: '/',
        component: Dashboard,
        meta: { requiresAuth: true, hideHeader: false }
    },
    {
        path: '/dashboard',
        component: Dashboard,
        meta: { requiresAuth: true, hideHeader: false }
    },
    {
        path: '/login',
        component: Login,
        meta: { requiresAuth: false, hideHeader: true }
    },
  
    {
        path: '/ask-question',
        component: CompanyList,
        meta: { requiresAuth: true , hideHeader: false,  permission:'list-questions' }
    },

    {
        path: '/posts',
        component: PostList,
        meta: { requiresAuth: true , hideHeader: false,  permission:'list-posts' }
    },


    {
        path: '/items',
        component: ItemList,
        meta: { requiresAuth: true , hideHeader: false, permission:'list-items' }
    },

    {
        path: '/addons',
        component: AddonList,
        meta: { requiresAuth: true , hideHeader: false, permission:'list-addons'  }
    },


    {
        path: '/banners/',
        component: BannerList,
        meta: { requiresAuth: true , hideHeader: false , permission:'list-banners'  }
    },
  
    {
        path: '/categories/',
        component: CategoryList,
        meta: { requiresAuth: true , hideHeader: false  , permission:'list-categories'  }
    },

    {
        path: '/business_types/',
        component: BusinessTypeList,
        meta: { requiresAuth: true , hideHeader: false  , permission:'list-business_types'  }
    },

    {
        path: '/services/',
        component: ServiceList,
        meta: { requiresAuth: true , hideHeader: false  , permission:'list-services'  }
    },
    
    {
        path: '/skills/',
        component: SkillList,
        meta: { requiresAuth: true , hideHeader: false  , permission:'list-skills'  }
    },
 

   
    {
        path: '/my-lawyers',
        component: UserList,
        meta: { requiresAuth: true , hideHeader: false , permission:'list-lawyers'  }
    },
   
    {
        path: '/lawyers',
        component: LawyersList,
        meta: { requiresAuth: true , hideHeader: false , permission:'list-lawyers'  }
    },

        {
            path: '/my-cases',
            component: MyCasesList,
            meta: { requiresAuth: true , hideHeader: false, permission:'list-cases' }
        },

        {
            path: '/my-cases/:id',
            component: MyCasesDetails,
            meta: { requiresAuth: true , hideHeader: false, permission:'view-case-details' }
        },

        {
            path: '/notifications',
            component: NotificationsList,
            meta: { requiresAuth: true , hideHeader: false, permission:'list-notifications' }
        },

 
 
    // {
    //     path: '/orders/:id',
    //     component: OrderDetails,
    //     meta: { requiresAuth: true , hideHeader: false , permission:'detail-orders' }
    // },



    {
        path: '/checkout',
        component: CheckoutForm,
        meta: { requiresAuth: false , hideHeader: true }
    },

    {
        path: '/chat/',
        component: UserList,
        meta: { requiresAuth: true , hideHeader: false }
    },
   
    {
        path: '/system-users/',
        component: SystemUserList,
        meta: { requiresAuth: true , hideHeader: false }
    },
    
    {
        path: '/account/',
        component: Account,
        meta: { requiresAuth: true , hideHeader: false }
    },
    {
        path: '/settings/',
        component: Setting,
        meta: { requiresAuth: true , hideHeader: false }
    },

    {
        path: '/websites',
        component: WebsiteList,
        meta: { requiresAuth: true, hideHeader: false, permission: 'read-websites' }
    },

    {
        path: '/employees',
        component: EmployeesList,
        meta: { requiresAuth: true, hideHeader: false, permission: 'list-employees' }
    },

    {
        path: '/my-account/:id',
        component: EmployeeDetails,
        meta: { requiresAuth: true, hideHeader: false, permission: 'view-employee-details' }
    },

    {
        path: '/help-support',
        component: HelpSupport,
        meta: { requiresAuth: true, hideHeader: false }
    },

    {
        path: '/track-my-ticket',
        component: TrackMyTicket,
        meta: { requiresAuth: true, hideHeader: false }
    },
    

    {
        path: '*',
        component: NotFound,
        meta: { requiresAuth: true , hideHeader: false }
    },
];

export default routes;
