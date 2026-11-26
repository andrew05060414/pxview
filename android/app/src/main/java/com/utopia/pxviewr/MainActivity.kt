package com.utopia.pxviewr

import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory
import com.utopia.pxviewr.SystemBars.SystemBarsModule
import com.zoontek.rnbootsplash.RNBootSplash

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
    RNBootSplash.init(this, R.style.BootTheme)
    super.onCreate(savedInstanceState)
    val nightModeFlags =
      resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
    val isSystemDark = nightModeFlags == Configuration.UI_MODE_NIGHT_YES
    SystemBarsModule.applyTransparentNavigationBar(this, isSystemDark)
  }

  override fun getMainComponentName(): String = "PxViewR"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
  }
}
