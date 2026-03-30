import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

export interface MealReminderConfig {
  breakfast: { enabled: boolean; hour: number; minute: number };
  lunch: { enabled: boolean; hour: number; minute: number };
  dinner: { enabled: boolean; hour: number; minute: number };
}

export const DEFAULT_REMINDERS: MealReminderConfig = {
  breakfast: { enabled: true, hour: 8, minute: 0 },
  lunch: { enabled: true, hour: 12, minute: 0 },
  dinner: { enabled: true, hour: 19, minute: 0 },
};

const MEAL_CONTENT: Record<string, { title: string; body: string }> = {
  breakfast: {
    title: "Bon appétit !",
    body: "C'est l'heure du petit-déjeuner ! N'oublie pas de noter ton repas.",
  },
  lunch: {
    title: "À table !",
    body: "C'est l'heure de manger ! Pense à noter ton déjeuner.",
  },
  dinner: {
    title: "Bon appétit !",
    body: "L'heure du dîner ! N'oublie pas de noter ce que tu manges.",
  },
};

export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("meals", {
      name: "Rappels repas",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleMealReminders(
  config: MealReminderConfig,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const [meal, settings] of Object.entries(config)) {
    if (!settings.enabled) continue;

    const content = MEAL_CONTENT[meal];
    if (!content) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.hour,
        minute: settings.minute,
        channelId: Platform.OS === "android" ? "meals" : undefined,
      },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
