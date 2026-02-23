import {
  Armchair,
  ChartColumn,
  ClipboardCheck,
  Handshake,
  IdCard,
  MapPin,
} from "lucide-react";

export const menus = [
  {
    title: "Dashboard",
    url: "/",
    icon: ChartColumn,
    isActive: undefined,
    subMenus: undefined,
  },
  {
    title: "Anuncios",
    url: "/advertisement",
    icon: ClipboardCheck,
    isActive: undefined,
    subMenus: undefined,
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Handshake,
    isActive: undefined,
    subMenus: undefined,
  },
  {
    title: "Ambientes",
    url: "/ambientes",
    icon: MapPin,
    isActive: undefined,
    subMenus: undefined,
  },
  {
    title: "Objetos",
    url: "/objetos",
    icon: Armchair,
    isActive: undefined,
    subMenus: undefined,
  },
  {
    title: "Controle de Acesso",
    url: "#",
    icon: IdCard,
    isActive: false,
    subMenus: [
      {
        title: "Usuários",
        url: "/usuarios",
      },
      {
        title: "Perfis",
        url: "/perfis",
      },
      {
        title: "Permissões",
        url: "/permissoes",
      },
    ],
  },
] as const;
