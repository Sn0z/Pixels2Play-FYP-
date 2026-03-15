import {
    GraduationCapIcon,
    HelpCircleIcon,
    HomeIcon,
    RocketIcon,
    SettingsIcon,
    UserIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import "./NavigationSection.css";

const navigationItems = [
    {
        icon: HomeIcon,
        label: "Home",
        isActive: false,
        path: "/",
    },
    {
        icon: GraduationCapIcon,
        label: "Lessons",
        isActive: false,
        path: "/courses",
    },
    {
        icon: RocketIcon,
        label: "Projects",
        isActive: false,
        path: "/projects",
    },
    {
        icon: UserIcon,
        label: "Child's Profile",
        isActive: true,
        path: "/profile",
    },
];

const bottomNavigationItems = [
    {
        icon: HelpCircleIcon,
        label: "Help",
    },
    {
        icon: SettingsIcon,
        label: "Settings",
    },
];

export const NavigationSection = () => {
    return (
        <nav className="nav-sidebar">
            <div className="nav-header">
                <Link to="/" className="nav-logo">
                    <span className="nav-logo-icon">🎮</span>
                    <span>Pixels2Play</span>
                </Link>
            </div>

            <div className="nav-main-links">
                {navigationItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={index}
                            to={item.path}
                            className={`nav-btn ${item.isActive ? "active" : ""}`}
                        >
                            <Icon />
                            {item.label}
                        </Link>
                    );
                })}
            </div>

            <div className="nav-bottom-links">
                {bottomNavigationItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={index}
                            className="nav-btn ghost"
                        >
                            <Icon />
                            {item.label}
                        </button>
                    );
                })}
                <button className="nav-btn nav-btn-signout">
                    Sign Out
                </button>
            </div>
        </nav>
    );
};