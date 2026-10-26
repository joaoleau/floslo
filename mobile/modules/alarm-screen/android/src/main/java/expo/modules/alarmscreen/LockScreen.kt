package expo.modules.alarmscreen

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import android.view.WindowManager

// Mostrar a tela do app sobre o bloqueio (e acender a tela) só enquanto um alarme está aberto.
// Antes isso era fixo no manifesto (android:showWhenLocked), o que deixava o app inteiro
// acessível com o celular bloqueado.
object LockScreen {
  fun isLocked(context: Context): Boolean {
    val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    return keyguard.isKeyguardLocked
  }

  fun showOverLockScreen(activity: Activity, enabled: Boolean) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      activity.setShowWhenLocked(enabled)
      activity.setTurnScreenOn(enabled)
    } else {
      @Suppress("DEPRECATION")
      val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      if (enabled) activity.window.addFlags(flags) else activity.window.clearFlags(flags)
    }
  }
}
