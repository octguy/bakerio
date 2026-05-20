export interface Location {
  name: string;
  address: string;
  region: string;
  hours: string;
  lat: number;
  lng: number;
}

export const locations: Location[] = [
  { name: "Bakerio Nguyễn Huệ", address: "45 Nguyễn Huệ, Bến Nghé, Quận 1", region: "District 1", hours: "Mon–Sun 7:00–22:00", lat: 10.7738, lng: 106.7030 },
  { name: "Bakerio Lê Lợi", address: "120 Lê Lợi, Bến Thành, Quận 1", region: "District 1", hours: "Mon–Sun 7:00–22:00", lat: 10.7725, lng: 106.6980 },
  { name: "Bakerio Phú Mỹ Hưng", address: "18 Nguyễn Lương Bằng, Tân Phú, Quận 7", region: "District 7", hours: "Mon–Sun 7:00–22:00", lat: 10.7295, lng: 106.7186 },
  { name: "Bakerio Crescent Mall", address: "101 Tôn Dật Tiên, Tân Phong, Quận 7", region: "District 7", hours: "Mon–Sun 7:00–22:00", lat: 10.7292, lng: 106.7195 },
  { name: "Bakerio Võ Văn Ngân", address: "215 Võ Văn Ngân, Linh Chiểu, Thủ Đức", region: "Thủ Đức", hours: "Mon–Sun 7:00–22:00", lat: 10.8510, lng: 106.7590 },
  { name: "Bakerio Gigamall", address: "240 Phạm Văn Đồng, Hiệp Bình Chánh, Thủ Đức", region: "Thủ Đức", hours: "Mon–Sun 7:00–22:00", lat: 10.8380, lng: 106.7100 },
];

export const regions = ["All", "District 1", "District 7", "Thủ Đức"] as const;
