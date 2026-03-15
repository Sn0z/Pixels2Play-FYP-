import {
  GraduationCapIcon,
  HelpCircleIcon,
  HomeIcon,
  RocketIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../../components/ui/avatar";
import { Button } from "../../../../components/ui/button";

const navigationItems = [
  {
    icon: HomeIcon,
    label: "Home",
    isActive: false,
  },
  {
    icon: GraduationCapIcon,
    label: "Lessons",
    isActive: false,
  },
  {
    icon: RocketIcon,
    label: "Projects",
    isActive: false,
  },
  {
    icon: UserIcon,
    label: "Child's Profile",
    isActive: true,
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
    <nav className="w-full h-full flex flex-col bg-white border-r border-[#e4e7eb]">
      <div className="px-6 pt-[92px] pb-8">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage
              src="https://c.animaapp.com/mlwk10dy8KFKXI/img/bg-center-bg-no-repeat-aspect-square-bg-cover-rounded-full-size-.png"
              alt="Sparky"
            />
            <AvatarFallback>SP</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="font-bold text-base leading-6 [font-family:'Plus_Jakarta_Sans',Helvetica] text-[#4a4a4a]">
              Sparky
            </div>
            <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-normal text-[#6b7180] text-sm leading-5">
              Level 5 Explorer
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 flex flex-col gap-2">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Button
              key={index}
              variant={item.isActive ? "default" : "ghost"}
              className={`h-12 justify-start gap-3 rounded-full ${item.isActive
                  ? "bg-[#4a90e2] text-white hover:bg-[#4a90e2]/90"
                  : "text-[#4a4a4a] hover:bg-gray-100"
                } [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-base`}
            >
              <Icon className="w-6 h-6" />
              {item.label}
            </Button>
          );
        })}
      </div>

      <div className="mt-auto px-6 pb-6 flex flex-col gap-2">
        {bottomNavigationItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Button
              key={index}
              variant="ghost"
              className="h-12 justify-start gap-3 rounded-full text-[#4a4a4a] hover:bg-gray-100 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-base"
            >
              <Icon className="w-6 h-6" />
              {item.label}
            </Button>
          );
        })}
        <Button className="h-12 mt-2 bg-[#ff9500] hover:bg-[#ff9500]/90 text-white rounded-full [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-base">
          Sign Out
        </Button>
      </div>
    </nav>
  );
};