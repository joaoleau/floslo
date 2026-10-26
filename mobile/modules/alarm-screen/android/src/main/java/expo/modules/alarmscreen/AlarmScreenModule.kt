package expo.modules.alarmscreen

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AlarmScreenModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AlarmScreen")

    // A partir do Android 14, a permissão de notificação em tela cheia não vem mais concedida
    // a todo app e pode estar desativada; sem ela, o alarme só toca a notificação e a tela de
    // disparo não abre sozinha com o celular bloqueado. Antes do Android 14 ela é concedida pela
    // declaração no manifesto.
    Function("canUseFullScreenIntent") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return@Function true
      val context = appContext.reactContext ?: return@Function true
      val notifications = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      notifications.canUseFullScreenIntent()
    }

    // Abre a tela do Android em que o usuário ativa as notificações em tela cheia do app.
    Function("openFullScreenIntentSettings") {
      val context = appContext.reactContext ?: return@Function null
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:${context.packageName}"))
      } else {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      null
    }

    // Liga ou desliga a exibição sobre a tela de bloqueio. Ligada pelo listener quando o alarme
    // abre o app com o celular bloqueado; desligada pela tela de disparo ao fechar.
    AsyncFunction("setShowOverLockScreen") { enabled: Boolean ->
      val activity = appContext.currentActivity ?: return@AsyncFunction null
      LockScreen.showOverLockScreen(activity, enabled)
      null
    }.runOnQueue(Queues.MAIN)
  }
}
