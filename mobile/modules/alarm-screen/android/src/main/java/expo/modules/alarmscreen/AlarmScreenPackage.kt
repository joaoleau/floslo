package expo.modules.alarmscreen

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener
import java.lang.ref.WeakReference

class AlarmScreenPackage : Package {
  override fun createReactActivityLifecycleListeners(activityContext: Context?): List<ReactActivityLifecycleListener> {
    return listOf(AlarmScreenActivityListener())
  }
}

class AlarmScreenActivityListener : ReactActivityLifecycleListener {
  private var activityRef: WeakReference<Activity>? = null

  override fun onCreate(activity: Activity?, savedInstanceState: Bundle?) {
    if (activity == null) return
    activityRef = WeakReference(activity)
    showIfLaunchedWhileLocked(activity)
  }

  override fun onNewIntent(intent: Intent?): Boolean {
    activityRef?.get()?.let { showIfLaunchedWhileLocked(it) }
    return false
  }

  private fun showIfLaunchedWhileLocked(activity: Activity) {
    if (LockScreen.isLocked(activity)) {
      LockScreen.showOverLockScreen(activity, true)
    }
  }
}
