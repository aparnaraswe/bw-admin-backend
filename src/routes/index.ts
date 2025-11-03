import { Router } from "express";
import user from "./user.route";
import common from "./common.route";


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
        path: "/product",
        route: common
    }
   
];

ProductionRoutes.forEach((route) => {
    router.use(route.path, route.route);
});

export default router;