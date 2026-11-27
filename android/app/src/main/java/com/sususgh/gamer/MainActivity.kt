package com.sususgh.gamer

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.zxing.integration.android.IntentIntegrator
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    private lateinit var status: TextView
    private lateinit var details: TextView
    private var pendingPairing: JSONObject? = null

    private val cameraPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startQrScanner() else status.text = "相机权限未授予，无法扫描配对二维码。"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(11, 18, 32)
        window.navigationBarColor = Color.rgb(11, 18, 32)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 32, 24, 24)
            setBackgroundColor(Color.rgb(11, 18, 32))
        }
        fun text(value: String, size: Float, color: Int = Color.WHITE): TextView =
            TextView(this).apply { this.text = value; textSize = size; setTextColor(color) }

        root.addView(text("GAMER MOBILE", 26f))
        root.addView(text("Android companion · API 26+", 14f, Color.rgb(105, 214, 208)))
        root.addView(text("连接 Windows 桌面端与 DSH 游戏智能体", 15f).apply {
            setPadding(0, 16, 0, 22)
        })

        status = text("设备状态：尚未配对", 16f, Color.rgb(255, 210, 120))
        root.addView(status)
        details = text("请扫描桌面端生成的一次性配对二维码。二维码不得包含模型 API 密钥。", 14f, Color.LTGRAY)
        details.setPadding(0, 12, 0, 24)
        root.addView(details)

        root.addView(actionButton("扫描桌面端二维码") { requestCameraAndScan() })
        root.addView(actionButton("解除本机配对状态") {
            pendingPairing = null
            status.text = "设备状态：尚未配对"
            details.text = "本机未保存长期凭据。"
        })
        root.addView(actionButton("紧急停止") {
            status.text = "已请求本机停止；当前版本尚未连接桌面执行通道。"
        })
        root.addView(text(
            "当前为 Android 客户端基础版：二维码扫描与用户确认界面已接入；" +
                "桌面认证服务、实时画面传输、视觉识别和触控执行仍需后续实现与联调。",
            12f, Color.rgb(160, 174, 192)
        ).apply { setPadding(0, 28, 0, 0) })

        setContentView(root)
    }

    private fun actionButton(label: String, action: () -> Unit): Button =
        Button(this).apply {
            text = label
            isAllCaps = false
            setOnClickListener { action() }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = 10 }
        }

    private fun requestCameraAndScan() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED) {
            startQrScanner()
        } else {
            cameraPermission.launch(Manifest.permission.CAMERA)
        }
    }

    private fun startQrScanner() {
        IntentIntegrator(this)
            .setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
            .setPrompt("扫描 Gamer Windows 桌面端的一次性配对二维码")
            .setBeepEnabled(false)
            .setOrientationLocked(false)
            .initiateScan()
    }

    @Deprecated("ZXing embedded uses the legacy activity result contract")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        val result = IntentIntegrator.parseActivityResult(requestCode, resultCode, data) ?: return
        val raw = result.contents ?: return
        try {
            val parsed = JSONObject(raw)
            val protocol = parsed.optString("protocol")
            val host = parsed.optString("host")
            val token = parsed.optString("pairing_token")
            if (protocol != "gamer-runtime/1" || host.isBlank() || token.isBlank()) {
                throw IllegalArgumentException("二维码缺少受支持的协议、主机地址或一次性配对令牌")
            }
            pendingPairing = parsed
            AlertDialog.Builder(this)
                .setTitle("确认配对请求")
                .setMessage("桌面主机：$host\n协议：$protocol\n\n确认后才会提交配对请求。请只连接你信任的电脑。")
                .setNegativeButton("拒绝", null)
                .setPositiveButton("确认") { _, _ ->
                    status.text = "二维码已确认 · 等待桌面端认证服务"
                    details.text = "已读取主机地址与一次性令牌；本版本尚未实现网络握手，因此不会显示为已连接。"
                }
                .show()
        } catch (e: Exception) {
            status.text = "二维码无效或协议不兼容"
            details.text = e.message ?: "请使用 Gamer 桌面端生成的配对二维码。"
        }
    }
}
