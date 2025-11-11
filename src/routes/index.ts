import { Router } from "express";
import user from "./user.route";
import common from "./common.route";
import usercommon from "./usercommon.route"


const router = Router();
interface IRoutes {
    path: string;
    route: Router;
}

const ProductionRoutes: IRoutes[] = [
    {
        path: "/auth",
        route: user
    },
    {
        path: "/cad",
        route: common
    },
    {
        path: "/product",
        route: common
    },
    {
        path : "/usercommon",
        route: usercommon
    }
   
   
];

ProductionRoutes.forEach((route) => {
    router.use(route.path, route.route);
});

export default router;