# Daily Habit Reminder - Flutter App 教程

这是一个使用 Flutter 构建的真正的 Android 每日提醒 App 的完整开发教程。它包含了本地数据库存储、图表统计以及真正的系统级定时通知。

## 核心功能
1. **每日任务与定时提醒**：创建习惯，设置时间，即使 App 在后台也能准时收到系统通知。
2. **打卡与统计**：记录每天的完成情况，并用直观的柱状图展示历史数据。
3. **美观界面**：采用 Material 3 设计规范，流畅的动画与交互。

---

## 第一步：环境准备

1. **安装 Flutter SDK**：请前往 [Flutter 官网](https://docs.flutter.dev/get-started/install) 下载并安装适合您操作系统的 SDK。
2. **配置 Android 环境**：安装 Android Studio，并确保安装了 Android SDK 和模拟器（或连接一台真实的 Android 手机）。
3. **验证环境**：在终端运行 `flutter doctor`，确保所有依赖都已正确安装（全部打勾）。

---

## 第二步：创建项目与添加依赖

1. 打开终端，创建一个新的 Flutter 项目：
   ```bash
   flutter create daily_habit
   cd daily_habit
   ```

2. 打开 `pubspec.yaml` 文件，在 `dependencies` 下添加以下依赖库：
   ```yaml
   dependencies:
     flutter:
       sdk: flutter
     
     # 本地数据库
     sqflite: ^2.3.0
     path: ^1.8.3
     
     # 日期处理
     intl: ^0.19.0
     
     # 统计图表
     fl_chart: ^0.66.0
     
     # 本地定时通知
     flutter_local_notifications: ^17.1.2
     timezone: ^0.9.2
   ```

3. 运行命令安装依赖：
   ```bash
   flutter pub get
   ```

---

## 第三步：配置 Android 权限

为了让通知功能正常工作，需要修改 Android 的配置文件。

打开 `android/app/src/main/AndroidManifest.xml`，在 `<manifest>` 标签内添加以下权限：

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- 允许应用在后台发送精确时间的通知 -->
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
    <!-- Android 13+ 需要的通知权限 -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

    <application
        android:label="Daily Habit"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher">
        
        <!-- 注册通知接收器，用于开机自启恢复通知 -->
        <receiver android:exported="false" android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationReceiver" />
        <receiver android:exported="false" android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationBootReceiver">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED"/>
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED"/>
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
                <action android:name="com.htc.intent.action.QUICKBOOT_POWERON"/>
            </intent-filter>
        </receiver>
        
        <activity>
            <!-- ... 保持原有内容 ... -->
        </activity>
    </application>
</manifest>
```

---

## 第四步：编写核心代码

在 `lib/` 目录下创建以下文件结构：
```text
lib/
  ├── main.dart
  ├── models/
  │   └── task.dart
  ├── services/
  │   ├── database_helper.dart
  │   └── notification_service.dart
  └── screens/
      ├── home_screen.dart
      ├── today_screen.dart
      └── stats_screen.dart
```

### 1. 数据模型 (`lib/models/task.dart`)
```dart
class Task {
  final int? id;
  final String title;
  final String time; // 格式 "HH:mm"

  Task({this.id, required this.title, required this.time});

  Map<String, dynamic> toMap() {
    return {'id': id, 'title': title, 'time': time};
  }

  factory Task.fromMap(Map<String, dynamic> map) {
    return Task(id: map['id'], title: map['title'], time: map['time']);
  }
}
```

### 2. 通知服务 (`lib/services/notification_service.dart`)
```dart
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

  Future<void> init() async {
    tz.initializeTimeZones();
    
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');
        
    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
    );
    
    await flutterLocalNotificationsPlugin.initialize(initializationSettings);
  }

  Future<void> scheduleDailyNotification(int id, String title, int hour, int minute) async {
    final now = tz.TZDateTime.now(tz.local);
    var scheduledDate = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
    
    if (scheduledDate.isBefore(now)) {
      scheduledDate = scheduledDate.add(const Duration(days: 1));
    }

    await flutterLocalNotificationsPlugin.zonedSchedule(
      id,
      '习惯提醒',
      '该去完成: $title 啦！',
      scheduledDate,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'daily_habit_channel',
          'Daily Habits',
          channelDescription: 'Reminders for daily habits',
          importance: Importance.max,
          priority: Priority.high,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: DateTimeComponents.time, // 每天同一时间重复
    );
  }
  
  Future<void> cancelNotification(int id) async {
    await flutterLocalNotificationsPlugin.cancel(id);
  }
}
```

### 3. 数据库服务 (`lib/services/database_helper.dart`)
```dart
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/task.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('habits.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        time TEXT NOT NULL
      )
    ''');
    
    await db.execute('''
      CREATE TABLE completions (
        task_id INTEGER,
        date TEXT,
        completed INTEGER,
        PRIMARY KEY (task_id, date),
        FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
      )
    ''');
  }

  Future<int> insertTask(Task task) async {
    final db = await instance.database;
    return await db.insert('tasks', task.toMap());
  }

  Future<List<Task>> getTasks() async {
    final db = await instance.database;
    final result = await db.query('tasks', orderBy: 'time ASC');
    return result.map((json) => Task.fromMap(json)).toList();
  }
  
  // 记录打卡状态
  Future<void> toggleCompletion(int taskId, String date, bool completed) async {
    final db = await instance.database;
    await db.insert(
      'completions',
      {'task_id': taskId, 'date': date, 'completed': completed ? 1 : 0},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }
  
  Future<bool> isCompleted(int taskId, String date) async {
    final db = await instance.database;
    final result = await db.query(
      'completions',
      where: 'task_id = ? AND date = ?',
      whereArgs: [taskId, date],
    );
    if (result.isEmpty) return false;
    return result.first['completed'] == 1;
  }
}
```

### 4. 主入口 (`lib/main.dart`)
```dart
import 'package:flutter/material.dart';
import 'services/notification_service.dart';
import 'screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService().init();
  runApp(const HabitApp());
}

class HabitApp extends StatelessWidget {
  const HabitApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Daily Habit',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
        scaffoldBackgroundColor: Colors.grey[50],
      ),
      home: const HomeScreen(),
    );
  }
}
```

### 5. 底部导航框架 (`lib/screens/home_screen.dart`)
```dart
import 'package:flutter/material.dart';
import 'today_screen.dart';
import 'stats_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const TodayScreen(),
    const StatsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.check_circle_outline), label: 'Today'),
          NavigationDestination(icon: Icon(Icons.bar_chart), label: 'Stats'),
        ],
      ),
    );
  }
}
```

### 6. 每日任务界面 (`lib/screens/today_screen.dart`)
```dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/task.dart';
import '../services/database_helper.dart';
import '../services/notification_service.dart';

class TodayScreen extends StatefulWidget {
  const TodayScreen({super.key});

  @override
  State<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends State<TodayScreen> {
  List<Task> _tasks = [];
  Map<int, bool> _completions = {};
  final String _today = DateFormat('yyyy-MM-dd').format(DateTime.now());

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final tasks = await DatabaseHelper.instance.getTasks();
    final Map<int, bool> comps = {};
    for (var task in tasks) {
      comps[task.id!] = await DatabaseHelper.instance.isCompleted(task.id!, _today);
    }
    setState(() {
      _tasks = tasks;
      _completions = comps;
    });
  }

  void _toggleTask(Task task) async {
    final current = _completions[task.id!] ?? false;
    final next = !current;
    
    setState(() {
      _completions[task.id!] = next;
    });
    
    await DatabaseHelper.instance.toggleCompletion(task.id!, _today, next);
  }

  void _showAddTaskDialog() {
    final titleController = TextEditingController();
    TimeOfDay selectedTime = const TimeOfDay(hour: 9, minute: 0);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 20, right: 20, top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('New Habit', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 20),
              TextField(
                controller: titleController,
                decoration: const InputDecoration(
                  labelText: 'What do you want to do?',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              ListTile(
                title: const Text('Reminder Time'),
                trailing: Text(selectedTime.format(context), style: const TextStyle(fontSize: 16)),
                onTap: () async {
                  final time = await showTimePicker(
                    context: context,
                    initialTime: selectedTime,
                  );
                  if (time != null) {
                    setModalState(() => selectedTime = time);
                  }
                },
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                  ),
                  onPressed: () async {
                    if (titleController.text.isEmpty) return;
                    
                    final timeStr = '${selectedTime.hour.toString().padLeft(2, '0')}:${selectedTime.minute.toString().padLeft(2, '0')}';
                    final task = Task(title: titleController.text, time: timeStr);
                    
                    // 保存到数据库
                    final id = await DatabaseHelper.instance.insertTask(task);
                    
                    // 注册本地定时通知
                    await NotificationService().scheduleDailyNotification(
                      id, task.title, selectedTime.hour, selectedTime.minute
                    );
                    
                    if (context.mounted) Navigator.pop(context);
                    _loadData();
                  },
                  child: const Text('Create Habit'),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    String displayDate = DateFormat('EEEE, MMMM d').format(DateTime.now());

    return Scaffold(
      appBar: AppBar(
        title: const Text('Today', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
      ),
      body: _tasks.isEmpty 
        ? const Center(child: Text('No habits yet. Tap + to add one.', style: TextStyle(color: Colors.grey)))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _tasks.length,
            itemBuilder: (context, index) {
              final task = _tasks[index];
              final isCompleted = _completions[task.id] ?? false;
              
              return Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                color: isCompleted ? Colors.grey.shade100 : Colors.white,
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  leading: IconButton(
                    icon: Icon(
                      isCompleted ? Icons.check_circle : Icons.circle_outlined,
                      color: isCompleted ? Colors.teal : Colors.grey.shade400,
                      size: 32,
                    ),
                    onPressed: () => _toggleTask(task),
                  ),
                  title: Text(
                    task.title,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      decoration: isCompleted ? TextDecoration.lineThrough : null,
                      color: isCompleted ? Colors.grey : Colors.black87,
                    ),
                  ),
                  subtitle: Text(task.time, style: const TextStyle(color: Colors.teal)),
                ),
              );
            },
          ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddTaskDialog,
        backgroundColor: Colors.teal,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}
```

### 7. 统计界面 (`lib/screens/stats_screen.dart`)
```dart
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

class StatsScreen extends StatelessWidget {
  const StatsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistics', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Weekly Overview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 30),
            SizedBox(
              height: 250,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: 100,
                  barTouchData: BarTouchData(enabled: false),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                          return Padding(
                            padding: const EdgeInsets.only(top: 8.0),
                            child: Text(days[value.toInt() % 7], style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          );
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  gridData: const FlGridData(show: false),
                  barGroups: [
                    // 这里为了演示写死了数据，实际开发中应从 DatabaseHelper 读取过去7天的数据并计算百分比
                    _makeGroupData(0, 80),
                    _makeGroupData(1, 100),
                    _makeGroupData(2, 40),
                    _makeGroupData(3, 60),
                    _makeGroupData(4, 90),
                    _makeGroupData(5, 100),
                    _makeGroupData(6, 50),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  BarChartGroupData _makeGroupData(int x, double y) {
    return BarChartGroupData(
      x: x,
      barRods: [
        BarChartRodData(
          toY: y,
          color: y == 100 ? Colors.teal : Colors.teal.shade200,
          width: 16,
          borderRadius: BorderRadius.circular(4),
          backDrawRodData: BackgroundBarChartRodData(
            show: true,
            toY: 100,
            color: Colors.grey.shade100,
          ),
        ),
      ],
    );
  }
}
```

---

## 第五步：运行与打包

1. **运行到模拟器或真机**：
   确保您的 Android 模拟器已启动，或手机已通过 USB 调试连接。
   ```bash
   flutter run
   ```

2. **打包为 APK 安装包**：
   当您开发完成，想要安装到手机上时，运行：
   ```bash
   flutter build apk --release
   ```
   编译完成后，APK 文件会生成在 `build/app/outputs/flutter-apk/app-release.apk` 目录下，您可以将其发送到手机上进行安装。

## 总结
通过以上步骤，您已经使用 Flutter 构建了一个真正的原生 Android 应用程序。它利用 `sqflite` 实现了数据的本地持久化，利用 `flutter_local_notifications` 实现了脱离后台的系统级定时推送，并使用 `fl_chart` 实现了美观的统计图表。
