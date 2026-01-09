"""
GitHub Classroom to Supabase Sync Tool

A robust tool for synchronizing GitHub Classroom grades directly to Supabase
without intermediate CSV files. Designed for production use with comprehensive
error handling, logging, and data validation.

Author: Senior Developer
Version: 2.0.0
License: MIT
"""

import os
import sys
import pandas as pd
import datetime
import logging
import tempfile
import subprocess
import requests
import time
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any, Union
from dataclasses import dataclass
from dotenv import load_dotenv
from supabase import create_client, Client
try:
    from supabase.exceptions import APIError
except ImportError:
    # Fallback for older versions of supabase-py
    class APIError(Exception):
        pass

# Load environment variables
load_dotenv()

# Configure logging with proper structure
def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Setup structured logging configuration."""
    log_level = getattr(logging, log_level.upper(), logging.INFO)

    # Create logs directory if it doesn't exist (relative to project root)
    log_dir = Path("../logs")
    log_dir.mkdir(exist_ok=True)

    # Configure logging
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_dir / 'classroom_sync.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )

    # Silence noisy third-party loggers
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)

    return logging.getLogger(__name__)

logger = setup_logging(os.getenv('LOG_LEVEL', 'INFO'))

@dataclass
class SyncConfig:
    """Configuration class for sync operations."""
    supabase_url: str
    supabase_key: str
    classroom_name: str
    assignment_id: Optional[str] = None
    log_level: str = "INFO"
    max_retries: int = 3
    timeout_seconds: int = 30
    search_username: Optional[str] = None  # Optional username to track in logs

class GitHubCLIError(Exception):
    """Custom exception for GitHub CLI errors."""
    pass

class SupabaseSyncError(Exception):
    """Custom exception for Supabase sync errors."""
    pass

class DataValidationError(Exception):
    """Custom exception for data validation errors."""
    pass

class GitHubAPIError(Exception):
    """Custom exception for GitHub API errors."""
    pass

class ClassroomSupabaseSync:
    """
    Robust GitHub Classroom to Supabase synchronization client.
    
    Features:
    - Comprehensive error handling
    - Data validation
    - Retry mechanisms
    - Structured logging
    - Type safety
    """
    
    def __init__(self, config: SyncConfig):
        """
        Initialize the Classroom Supabase sync client.
        
        Args:
            config: SyncConfig object with all required configuration
        """
        self.config = config
        self.supabase: Client = self._initialize_supabase()
        logger.info("ClassroomSupabaseSync initialized successfully")
    
    def _initialize_supabase(self) -> Client:
        """Initialize Supabase client with error handling."""
        try:
            # Log configuration for debugging
            logger.info(f"Initializing Supabase client...")
            logger.info(f"Supabase URL: {self.config.supabase_url[:30]}...")
            logger.info(f"Supabase Key: {self.config.supabase_key[:20]}...")
            
            # Test URL format
            if not self.config.supabase_url.startswith('https://'):
                raise SupabaseSyncError("SUPABASE_URL must start with https://")
            
            # Test basic connectivity
            import requests
            try:
                response = requests.get(self.config.supabase_url, timeout=10)
                logger.info(f"Supabase URL is reachable (status: {response.status_code})")
            except requests.exceptions.RequestException as e:
                logger.warning(f"Supabase URL connectivity test failed: {e}")
            
            # Create client
            client = create_client(self.config.supabase_url, self.config.supabase_key)
            logger.info("Supabase client created successfully")
            
            # Test connection with a simple query that doesn't require RLS
            try:
                result = client.table('zzz_students').select('github_username').limit(1).execute()
                logger.info("Supabase connection verified")
                return client
            except Exception as query_error:
                logger.warning(f"Initial query failed, but client created: {query_error}")
                # Return client anyway, the query might fail due to RLS but client is valid
                return client
                
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            raise SupabaseSyncError(f"Supabase initialization failed: {e}")
    
    def _execute_gh_command(self, command: str) -> str:
        """
        Execute GitHub CLI command with proper error handling.

        Args:
            command: GitHub CLI command to execute

        Returns:
            Command output as string

        Raises:
            GitHubCLIError: If command execution fails
        """
        try:
            # GitHub CLI should use its own authentication for classroom commands
            # Remove GITHUB_TOKEN from environment to avoid permission issues
            env = os.environ.copy()
            if 'GITHUB_TOKEN' in env:
                logger.debug("Temporarily removing GITHUB_TOKEN for gh classroom command")
                del env['GITHUB_TOKEN']

            result = subprocess.run(
                command.split(),
                capture_output=True,
                text=True,
                timeout=self.config.timeout_seconds,
                check=True,
                env=env
            )
            return result.stdout
        except subprocess.TimeoutExpired:
            logger.error(f"GitHub CLI command timed out: {command}")
            raise GitHubCLIError(f"Command timed out: {command}")
        except subprocess.CalledProcessError as e:
            logger.error(f"GitHub CLI command failed: {command}, Error: {e.stderr}")
            raise GitHubCLIError(f"Command failed: {e.stderr}")
        except Exception as e:
            logger.error(f"Unexpected error executing command: {command}, Error: {e}")
            raise GitHubCLIError(f"Unexpected error: {e}")
    
    def get_classroom_id(self, classroom_name: str) -> Optional[str]:
        """
        Get classroom ID by name with comprehensive error handling.
        
        Args:
            classroom_name: Name of the classroom to find
            
        Returns:
            Classroom ID if found, None otherwise
        """
        logger.info(f"Searching for classroom: {classroom_name}")
        
        try:
            output = self._execute_gh_command('gh classroom list')
            classrooms = self._parse_classroom_list(output)
            
            for classroom_id, name in classrooms:
                if name == classroom_name:
                    logger.info(f"Found classroom ID: {classroom_id}")
                    return classroom_id
            
            logger.warning(f"Classroom '{classroom_name}' not found")
            return None
            
        except GitHubCLIError as e:
            logger.error(f"Failed to get classroom list: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting classroom ID: {e}")
            raise GitHubCLIError(f"Unexpected error: {e}")
    
    def _parse_classroom_list(self, output: str) -> List[Tuple[str, str]]:
        """
        Parse classroom list output from GitHub CLI.
        
        Args:
            output: Raw output from 'gh classroom list'
            
        Returns:
            List of (classroom_id, classroom_name) tuples
        """
        lines = output.strip().split('\n')
        if len(lines) < 4:
            raise DataValidationError("Invalid classroom list format")
        
        # Skip header lines (first 3 lines)
        classrooms = []
        for line in lines[3:]:
            if line.strip():
                parts = line.split()
                if len(parts) >= 2:
                    classrooms.append((parts[0], parts[1]))
        
        return classrooms
    
    def get_assignments(self, classroom_id: str) -> List[Tuple[str, str, str]]:
        """
        Get assignments for a classroom with error handling.
        
        Args:
            classroom_id: ID of the classroom
            
        Returns:
            List of (assignment_id, assignment_name, assignment_repo) tuples
        """
        logger.info(f"Getting assignments for classroom: {classroom_id}")
        
        try:
            output = self._execute_gh_command(f'gh classroom assignments -c {classroom_id}')
            assignments = self._parse_assignments_list(output)
            logger.info(f"Found {len(assignments)} assignments")
            return assignments
            
        except GitHubCLIError as e:
            logger.error(f"Failed to get assignments: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting assignments: {e}")
            raise GitHubCLIError(f"Unexpected error: {e}")
    
    def _parse_assignments_list(self, output: str) -> List[Tuple[str, str, str]]:
        """
        Parse assignments list output from GitHub CLI.

        Args:
            output: Raw output from 'gh classroom assignments'

        Returns:
            List of (assignment_id, assignment_name, assignment_repo) tuples
        """
        lines = output.strip().split('\n')

        # Debug logging
        logger.debug(f"Parsing assignments list - Total lines: {len(lines)}")
        for i, line in enumerate(lines[:5]):  # Log first 5 lines
            logger.debug(f"Line {i}: {repr(line)}")

        if len(lines) < 4:
            logger.error(f"Invalid assignments list format - only {len(lines)} lines (expected >= 4)")
            logger.error(f"Output was: {repr(output[:500])}")
            raise DataValidationError("Invalid assignments list format")

        assignments = []
        for line in lines[3:]:  # Skip header lines
            if line.strip():
                parts = line.split('\t')
                if len(parts) >= 7:
                    assignments.append((parts[0], parts[1], parts[6]))

        return assignments
    
    def download_grades_to_dataframe(self, assignment_id: str) -> Optional[pd.DataFrame]:
        """
        Download grades for an assignment with robust error handling.
        
        Args:
            assignment_id: ID of the assignment
            
        Returns:
            DataFrame with grades data or None if failed
        """
        logger.info(f"Downloading grades for assignment: {assignment_id}")
        
        temp_file = None
        try:
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(mode='w+', suffix='.csv', delete=False)
            temp_path = temp_file.name
            temp_file.close()
            
            # Download grades
            self._execute_gh_command(f'gh classroom assignment-grades -a {assignment_id} -f {temp_path}')
            
            # Validate file
            if not os.path.exists(temp_path) or os.path.getsize(temp_path) == 0:
                logger.warning(f"No grades data found for assignment: {assignment_id}")
                return None
            
            # Load and validate DataFrame
            df = pd.read_csv(temp_path)
            self._validate_grades_dataframe(df, assignment_id)
            
            logger.info(f"Successfully downloaded {len(df)} grade records")
            return df
            
        except (GitHubCLIError, DataValidationError) as e:
            logger.error(f"Failed to download grades for {assignment_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error downloading grades: {e}")
            return None
        finally:
            # Cleanup
            if temp_file and os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def _validate_grades_dataframe(self, df: pd.DataFrame, assignment_id: str) -> None:
        """
        Validate grades DataFrame structure and data.
        
        Args:
            df: DataFrame to validate
            assignment_id: Assignment ID for context
            
        Raises:
            DataValidationError: If validation fails
        """
        required_columns = ['github_username', 'points_awarded', 'points_available']
        
        # Check required columns
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise DataValidationError(f"Missing required columns: {missing_columns}")
        
        # Check for empty DataFrame
        if df.empty:
            raise DataValidationError("Empty grades DataFrame")
        
        # Check data types
        if not df['github_username'].dtype == 'object':
            raise DataValidationError("github_username must be string type")
        
        # Check for null values in critical columns
        if df['github_username'].isnull().any():
            raise DataValidationError("github_username cannot contain null values")
        
        logger.debug(f"Grades DataFrame validation passed for assignment: {assignment_id}")
    
    def get_repository_info(self, repo_url: str) -> Optional[Dict[str, Any]]:
        """
        Get repository information from GitHub API including creation and update dates.
        Uses gh CLI for authentication to avoid token permission issues.

        Args:
            repo_url: GitHub repository URL

        Returns:
            Dictionary with repository info or None if failed
        """
        if not repo_url or not isinstance(repo_url, str):
            logger.warning(f"Invalid repository URL: {repo_url}")
            return None

        try:
            # Extract owner/repo from URL
            # URL format: https://github.com/B4OS-Dev/the-moria-mining-codex-part-1-kleysc
            url_parts = repo_url.replace('https://github.com/', '').split('/')
            if len(url_parts) != 2:
                logger.warning(f"Invalid GitHub URL format: {repo_url}")
                return None

            owner, repo = url_parts

            # Use gh api command instead of direct HTTP requests
            # This uses the same authentication as gh classroom commands
            api_endpoint = f'repos/{owner}/{repo}'

            logger.debug(f"Fetching repo info: {api_endpoint}")

            # Remove GITHUB_TOKEN from environment to use gh CLI auth
            env = os.environ.copy()
            if 'GITHUB_TOKEN' in env:
                del env['GITHUB_TOKEN']

            result = subprocess.run(
                ['gh', 'api', api_endpoint],
                capture_output=True,
                text=True,
                timeout=10,
                env=env
            )

            if result.returncode == 0:
                import json
                repo_data = json.loads(result.stdout)
                logger.debug(f"Successfully fetched repo info for {repo}")
                return {
                    'created_at': repo_data.get('created_at'),
                    'updated_at': repo_data.get('updated_at'),
                    'pushed_at': repo_data.get('pushed_at'),
                    'full_name': repo_data.get('full_name'),
                    'html_url': repo_data.get('html_url'),
                    'is_fork': repo_data.get('fork', False),
                    'parent': repo_data.get('parent')
                }
            else:
                error_msg = result.stderr.strip()
                logger.debug(f"gh api failed - returncode: {result.returncode}, stderr: {error_msg[:200]}")
                if 'Not Found' in error_msg or '404' in error_msg:
                    logger.warning(f"Repository not found: {repo_url}")
                elif 'rate limit' in error_msg.lower():
                    logger.warning(f"Rate limit exceeded for repository: {repo_url}")
                else:
                    logger.warning(f"GitHub API error for repository {repo_url}: {error_msg}")
                return None

        except subprocess.TimeoutExpired:
            logger.error(f"GitHub API request timed out for {repo_url}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting repository info for {repo_url}: {e}")
            return None
    
    def calculate_resolution_time(self, created_at: str, updated_at: str) -> Optional[int]:
        """
        Calculate Time Spent in hours between repository creation and last update.
        This represents the time from fork creation to reaching maximum score.

        Args:
            created_at: Repository creation timestamp (fork date)
            updated_at: Repository last update timestamp (when max score was reached)

        Returns:
            Time Spent in hours or None if calculation fails
        """
        try:
            if not created_at or not updated_at:
                return None

            # Parse timestamps
            created = datetime.datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            updated = datetime.datetime.fromisoformat(updated_at.replace('Z', '+00:00'))

            # Calculate difference in hours
            time_diff = updated - created
            resolution_hours = int(time_diff.total_seconds() / 3600)

            return resolution_hours

        except Exception as e:
            logger.error(f"Error calculating Time Spent: {e}")
            return None

    def get_workflow_runs(self, repo_url: str) -> Optional[Dict[str, Any]]:
        """
        Get workflow runs from GitHub Actions for a repository.
        This represents the number of attempts a student made.

        Args:
            repo_url: GitHub repository URL

        Returns:
            Dictionary with workflow run statistics or None if failed
        """
        if not repo_url or not isinstance(repo_url, str):
            logger.warning(f"Invalid repository URL: {repo_url}")
            return None

        try:
            # Extract owner/repo from URL
            url_parts = repo_url.replace('https://github.com/', '').split('/')
            if len(url_parts) != 2:
                logger.warning(f"Invalid GitHub URL format: {repo_url}")
                return None

            owner, repo = url_parts

            # Get workflow runs using gh CLI (limit to 100 most recent)
            api_endpoint = f'repos/{owner}/{repo}/actions/runs?per_page=100'

            logger.debug(f"Fetching workflow runs: {api_endpoint}")

            # Remove GITHUB_TOKEN from environment to use gh CLI auth
            env = os.environ.copy()
            if 'GITHUB_TOKEN' in env:
                del env['GITHUB_TOKEN']

            result = subprocess.run(
                ['gh', 'api', api_endpoint],
                capture_output=True,
                text=True,
                timeout=10,
                env=env
            )

            if result.returncode == 0:
                import json
                runs_data = json.loads(result.stdout)

                total_runs = runs_data.get('total_count', 0)
                workflow_runs = runs_data.get('workflow_runs', [])

                # Count by conclusion status
                successful_runs = len([r for r in workflow_runs if r.get('conclusion') == 'success'])
                failed_runs = len([r for r in workflow_runs if r.get('conclusion') == 'failure'])

                # Get first and last run dates (runs are ordered by created_at desc)
                first_run = workflow_runs[-1] if workflow_runs else None
                last_run = workflow_runs[0] if workflow_runs else None

                logger.debug(f"Found {total_runs} workflow runs for {repo} ({successful_runs} successful, {failed_runs} failed)")

                return {
                    'total_attempts': total_runs,
                    'successful_attempts': successful_runs,
                    'failed_attempts': failed_runs,
                    'first_attempt_at': first_run.get('created_at') if first_run else None,
                    'last_attempt_at': last_run.get('created_at') if last_run else None
                }
            else:
                error_msg = result.stderr.strip()
                # Don't log as error if repo just has no workflows
                if 'not found' in error_msg.lower() or '404' in error_msg:
                    logger.debug(f"No workflow runs found for {repo_url}")
                else:
                    logger.debug(f"gh api failed for workflow runs - {error_msg[:200]}")
                return None

        except subprocess.TimeoutExpired:
            logger.error(f"GitHub API request timed out for workflow runs: {repo_url}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting workflow runs for {repo_url}: {e}")
            return None
    
    def refresh_admin_leaderboard(self) -> None:
        """
        Refresh the admin leaderboard table with current data.
        This version calculates the ranking directly in Python instead of using SQL function.
        
        Raises:
            SupabaseSyncError: If refresh fails
        """
        logger.info("Refreshing admin leaderboard...")
        
        try:
            # Get all students with their data
            students_result = self.supabase.table('zzz_students').select('github_username, fork_created_at, last_updated_at, has_fork').execute()

            if not students_result.data:
                logger.warning("No students found for leaderboard")
                return

            # Get all grades (including fork_created_at to count accepted assignments)
            grades_result = self.supabase.table('zzz_grades').select('github_username, assignment_name, points_awarded, fork_created_at').execute()

            # Get all assignments
            assignments_result = self.supabase.table('zzz_assignments').select('name, points_available').execute()
            
            # Create lookup dictionaries
            assignment_points = {a['name']: a['points_available'] for a in assignments_result.data if a['points_available']}

            # KISS: For assignments with no points_available, use the max points_awarded as reference
            # This handles cases where GitHub Classroom doesn't have points configured
            for assignment_name in set(g['assignment_name'] for g in grades_result.data):
                if assignment_name not in assignment_points or assignment_points[assignment_name] == 0:
                    # Find the maximum points awarded for this assignment
                    max_points = max(
                        (int(g['points_awarded']) if g['points_awarded'] else 0 for g in grades_result.data
                         if g['assignment_name'] == assignment_name and g['points_awarded']),
                        default=0
                    )
                    if max_points > 0:
                        assignment_points[assignment_name] = max_points
                        logger.info(f"Using max points ({max_points}) as reference for assignment: {assignment_name}")

            # Get total number of assignments in the system for progress calculation
            total_system_assignments = len(assignments_result.data) if assignments_result.data else 1

            # Calculate leaderboard data for each student
            leaderboard_data = []

            for student in students_result.data:
                github_username = student['github_username']
                has_fork = student.get('has_fork', False)

                # Get grades for this student
                student_grades = [g for g in grades_result.data if g['github_username'] == github_username]

                # Calculate totals (convert points_awarded to int)
                total_score = sum(int(grade['points_awarded']) for grade in student_grades if grade['points_awarded'])
                total_possible = sum(assignment_points.get(grade['assignment_name'], 0) for grade in student_grades)

                # Count unique assignments where student has a grade
                unique_assignments = set(g['assignment_name'] for g in student_grades)
                assignments_completed = len(unique_assignments)

                # Calculate progress as: sum of individual progresss / total assignments in system
                # This ensures fair comparison: student with 6 assignments at 100% = 100%
                # vs student with 1 assignment at 100% = 16.67% (if total is 6)
                sum_of_progresss = sum(
                    (int(grade['points_awarded']) / assignment_points.get(grade['assignment_name'], 1)) * 100
                    for grade in student_grades
                    if grade['points_awarded'] and assignment_points.get(grade['assignment_name'], 0) > 0
                )
                progress = round(sum_of_progresss / total_system_assignments)
                
                # Calculate Time Spent only if student has a fork
                if has_fork:
                    resolution_time_hours = self.calculate_resolution_time(
                        student['fork_created_at'], 
                        student['last_updated_at']
                    )
                else:
                    resolution_time_hours = None
                    logger.debug(f"Student has no fork - skipping Time Spent calculation")
                
                # Store progress for both sorting and DB
                leaderboard_entry = {
                    'github_username': github_username,
                    'fork_created_at': student['fork_created_at'],
                    'last_updated_at': student['last_updated_at'],
                    'resolution_time_hours': resolution_time_hours,
                    'has_fork': has_fork,
                    'total_score': total_score,
                    'total_possible': total_possible,
                    'percentage': progress,  # Save to DB
                    'assignments_completed': assignments_completed
                }
                leaderboard_entry['_progress'] = progress  # Temp field for sorting
                leaderboard_data.append(leaderboard_entry)
            
            # Sort by ranking criteria:
            # 1. Time Spent ASC (who solved fastest)
            # 2. progress DESC (higher score as tiebreaker)
            # 3. Username ASC (alphabetical as final tiebreaker)
            leaderboard_data.sort(key=lambda x: (
                x['resolution_time_hours'] if x['resolution_time_hours'] is not None else 999999,
                -x['_progress'],  # Negative for descending order
                x['github_username']
            ))
            
            # Log ranking summary (without exposing usernames)
            logger.info(f"Leaderboard calculated for {len(leaderboard_data)} students")
            
            # Add ranking positions and remove temp sorting field
            for i, student in enumerate(leaderboard_data, 1):
                student['ranking_position'] = i
                del student['_progress']  # Remove temp field before DB insert
            
            # Clear existing data and insert new data
            # Use a different approach to clear data that works with RLS
            try:
                # Try to clear existing data
                self.supabase.table('zzz_admin_leaderboard').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
            except Exception as e:
                logger.warning(f"Could not clear existing data: {e}")
                # Continue anyway, the insert will handle conflicts
            
            # Insert new data in batches to avoid RLS issues
            batch_size = 10
            inserted_count = 0
            upserted_count = 0

            for i in range(0, len(leaderboard_data), batch_size):
                batch = leaderboard_data[i:i + batch_size]
                try:
                    self.supabase.table('zzz_admin_leaderboard').insert(batch).execute()
                    inserted_count += len(batch)
                except Exception:
                    # Batch insert failed, try individual upserts (handles both insert and update)
                    for student in batch:
                        try:
                            self.supabase.table('zzz_admin_leaderboard').upsert(student, on_conflict='github_username').execute()
                            upserted_count += 1
                        except Exception as individual_error:
                            logger.error(f"Failed to upsert student: {individual_error}")

            logger.info(f"✓ Refreshed leaderboard: {len(leaderboard_data)} students (Inserted: {inserted_count}, Updated: {upserted_count})")
            
        except Exception as e:
            logger.error(f"Failed to refresh admin leaderboard: {e}")
            raise SupabaseSyncError(f"Failed to refresh admin leaderboard: {e}")
    
    def format_assignment_name(self, name: str) -> str:
        """
        Format assignment name for database storage.
        
        Args:
            name: Original assignment name
            
        Returns:
            Formatted assignment name
        """
        if not name or not isinstance(name, str):
            raise DataValidationError("Assignment name must be a non-empty string")
        
        # Clean and format assignment name for GitHub repository naming
        # Convert to lowercase, replace spaces and special chars with hyphens
        # Remove multiple consecutive hyphens
        import re
        formatted = name.lower()
        formatted = re.sub(r'[^a-z0-9\s-]', '', formatted)  # Keep only alphanumeric, spaces, and hyphens
        formatted = re.sub(r'\s+', '-', formatted)  # Replace spaces with single hyphen
        formatted = re.sub(r'-+', '-', formatted)  # Replace multiple hyphens with single hyphen
        formatted = formatted.strip('-')  # Remove leading/trailing hyphens
        
        logger.debug(f"Formatted assignment name: '{name}' -> '{formatted}'")
        return formatted
    
    def sync_students_to_supabase(self, students_data: List[Dict[str, Any]]) -> None:
        """
        Sync students to Supabase with retry mechanism.

        Args:
            students_data: List of student data dictionaries with repository info

        Raises:
            SupabaseSyncError: If sync fails after retries
        """
        if not students_data:
            logger.warning("No students to sync")
            return

        logger.info(f"Syncing {len(students_data)} students to Supabase")

        # Prepare data for Supabase
        supabase_data = []
        students_with_forks = 0
        for student in students_data:
            try:
                student_record = {
                    "github_username": str(student['github_username']).strip(),
                    "updated_at": datetime.datetime.now().isoformat()
                }

                # Add repository dates if available
                if 'fork_created_at' in student and student['fork_created_at']:
                    student_record['fork_created_at'] = student['fork_created_at']
                    students_with_forks += 1

                if 'last_updated_at' in student and student['last_updated_at']:
                    student_record['last_updated_at'] = student['last_updated_at']

                if 'resolution_time_hours' in student and student['resolution_time_hours'] is not None:
                    student_record['resolution_time_hours'] = student['resolution_time_hours']

                supabase_data.append(student_record)

            except (KeyError, ValueError, TypeError) as e:
                logger.error(f"Invalid student data: {student}, Error: {e}")
                continue

        if not supabase_data:
            logger.warning("No valid students data to sync")
            return

        # Retry mechanism
        for attempt in range(self.config.max_retries):
            try:
                self.supabase.table('zzz_students').upsert(
                    supabase_data,
                    on_conflict='github_username'
                ).execute()
                logger.info(f"✓ Synced {len(supabase_data)} students ({students_with_forks} with forks)")
                return

            except APIError as e:
                logger.error(f"Supabase API error (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise SupabaseSyncError(f"Failed to sync students after {self.config.max_retries} attempts: {e}")
            except Exception as e:
                logger.error(f"Unexpected error syncing students (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise SupabaseSyncError(f"Failed to sync students: {e}")
    
    def sync_assignments_to_supabase(self, assignments: List[Dict[str, Any]]) -> None:
        """
        Sync assignments to Supabase with retry mechanism.
        
        Args:
            assignments: List of assignment data dictionaries
            
        Raises:
            SupabaseSyncError: If sync fails after retries
        """
        if not assignments:
            logger.warning("No assignments to sync")
            return
        
        logger.info(f"Syncing {len(assignments)} assignments to Supabase")
        
        # Prepare data with validation
        assignments_data = []
        for assignment in assignments:
            try:
                points_available = assignment.get('points_available')
                assignments_data.append({
                    "name": str(assignment['name']).strip(),
                    "points_available": int(points_available) if points_available is not None else None,
                    "updated_at": datetime.datetime.now().isoformat()
                })
            except (KeyError, ValueError, TypeError) as e:
                logger.error(f"Invalid assignment data: {assignment}, Error: {e}")
                continue
        
        if not assignments_data:
            logger.warning("No valid assignments data to sync")
            return
        
        # Retry mechanism
        for attempt in range(self.config.max_retries):
            try:
                self.supabase.table('zzz_assignments').upsert(
                    assignments_data,
                    on_conflict='name'
                ).execute()
                assignment_names = [a['name'] for a in assignments_data]
                logger.info(f"✓ Synced {len(assignments_data)} assignments: {', '.join(assignment_names[:3])}{'...' if len(assignment_names) > 3 else ''}")
                return

            except APIError as e:
                logger.error(f"Supabase API error (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise SupabaseSyncError(f"Failed to sync assignments after {self.config.max_retries} attempts: {e}")
            except Exception as e:
                logger.error(f"Unexpected error syncing assignments (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise SupabaseSyncError(f"Failed to sync assignments: {e}")
    
    def sync_grades_to_supabase(self, grades_df: pd.DataFrame) -> None:
        """
        Sync grades to Supabase with retry mechanism.
        
        Args:
            grades_df: DataFrame with grades data
            
        Raises:
            SupabaseSyncError: If sync fails after retries
        """
        if grades_df.empty:
            logger.warning("No grades to sync")
            return
        
        logger.info(f"Syncing {len(grades_df)} grade records to Supabase")
        
        # Prepare data with validation
        grades_data = []
        for _, row in grades_df.iterrows():
            try:
                points_awarded = row['points_awarded']
                grade_record = {
                    "github_username": str(row['github_username']).strip(),
                    "assignment_name": str(row['assignment_name']).strip(),
                    "points_awarded": int(points_awarded) if pd.notna(points_awarded) else None
                }

                # Add fork dates if available
                if 'fork_created_at' in row and pd.notna(row['fork_created_at']):
                    grade_record['fork_created_at'] = row['fork_created_at']

                if 'fork_updated_at' in row and pd.notna(row['fork_updated_at']):
                    grade_record['fork_updated_at'] = row['fork_updated_at']

                grades_data.append(grade_record)
            except (KeyError, ValueError, TypeError) as e:
                logger.error(f"Invalid grade data: {row.to_dict()}, Error: {e}")
                continue
        
        if not grades_data:
            logger.warning("No valid grades data to sync")
            return
        
        # Calculate statistics for logging
        unique_students = len(set(g['github_username'] for g in grades_data))
        unique_assignments = len(set(g['assignment_name'] for g in grades_data))

        # Retry mechanism
        for attempt in range(self.config.max_retries):
            try:
                self.supabase.table('zzz_grades').upsert(
                    grades_data,
                    on_conflict='github_username,assignment_name'
                ).execute()
                logger.info(f"✓ Synced {len(grades_data)} grade records ({unique_students} students × {unique_assignments} assignments)")
                return

            except APIError as e:
                logger.error(f"Supabase API error (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise SupabaseSyncError(f"Failed to sync grades after {self.config.max_retries} attempts: {e}")
            except Exception as e:
                logger.error(f"Unexpected error syncing grades (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise SupabaseSyncError(f"Failed to sync grades: {e}")

    def sync_assignment_attempts_to_supabase(self, attempts_data: List[Dict[str, Any]]) -> None:
        """
        Sync assignment attempts (workflow runs) to Supabase with retry mechanism.

        Args:
            attempts_data: List of attempt data dictionaries with workflow statistics

        Raises:
            SupabaseSyncError: If sync fails after retries
        """
        if not attempts_data:
            logger.warning("No assignment attempts to sync")
            return

        logger.info(f"Syncing {len(attempts_data)} assignment attempt records to Supabase")

        # Get user_id and assignment_id mappings from database
        try:
            # Get all users to map github_username -> user_id
            users_result = self.supabase.table('zzz_students').select('id, github_username').execute()
            user_map = {u['github_username']: u['id'] for u in users_result.data if u.get('github_username')}

            # Get all assignments to map assignment_name -> assignment_id
            assignments_result = self.supabase.table('zzz_assignments').select('id, name').execute()
            assignment_map = {a['name']: a['id'] for a in assignments_result.data}

            logger.debug(f"Mapped {len(user_map)} users and {len(assignment_map)} assignments")

        except Exception as e:
            logger.error(f"Failed to get user/assignment mappings: {e}")
            raise SupabaseSyncError(f"Failed to get mappings: {e}")

        # Prepare data with UUID mappings
        prepared_attempts = []
        for attempt in attempts_data:
            try:
                github_username = attempt['github_username']
                assignment_name = attempt['assignment_name']

                # Get UUIDs from mappings
                user_id = user_map.get(github_username)
                assignment_id = assignment_map.get(assignment_name)

                if not user_id:
                    logger.warning(f"User not found in zzz_students: {github_username}, skipping")
                    continue

                if not assignment_id:
                    logger.warning(f"Assignment not found in zzz_assignments: {assignment_name}, skipping")
                    continue

                attempt_record = {
                    "user_id": user_id,
                    "assignment_id": assignment_id,
                    "repo_url": attempt['repo_url'],
                    "total_attempts": attempt['total_attempts'],
                    "successful_attempts": attempt['successful_attempts'],
                    "failed_attempts": attempt['failed_attempts'],
                    "first_attempt_at": attempt['first_attempt_at'],
                    "last_attempt_at": attempt['last_attempt_at'],
                    "fork_created_at": attempt.get('fork_created_at'),
                    "fork_updated_at": attempt.get('fork_updated_at'),
                    "updated_at": datetime.datetime.now().isoformat()
                }

                prepared_attempts.append(attempt_record)

            except (KeyError, ValueError, TypeError) as e:
                logger.error(f"Invalid attempt data: {attempt}, Error: {e}")
                continue

        if not prepared_attempts:
            logger.warning("No valid assignment attempts data to sync")
            return

        # Calculate statistics for logging
        total_attempts = sum(a['total_attempts'] for a in prepared_attempts)
        successful = sum(a['successful_attempts'] for a in prepared_attempts)
        failed = sum(a['failed_attempts'] for a in prepared_attempts)

        # Retry mechanism
        for attempt in range(self.config.max_retries):
            try:
                # Upsert based on user_id and assignment_id combination
                self.supabase.table('zzz_assignment_attempts').upsert(
                    prepared_attempts,
                    on_conflict='user_id,assignment_id'
                ).execute()
                logger.info(f"✓ Synced {len(prepared_attempts)} assignment attempts (Total: {total_attempts}, Success: {successful}, Failed: {failed})")
                return

            except APIError as e:
                logger.error(f"Supabase API error (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise SupabaseSyncError(f"Failed to sync assignment attempts after {self.config.max_retries} attempts: {e}")
            except Exception as e:
                logger.error(f"Unexpected error syncing assignment attempts (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise SupabaseSyncError(f"Failed to sync assignment attempts: {e}")

    def process_assignments_in_memory(self, assignment_data: List[Tuple[str, str, str]]) -> pd.DataFrame:
        """
        Process all assignments and consolidate grades in memory.
        
        Args:
            assignment_data: List of (assignment_id, assignment_name, assignment_repo) tuples
            
        Returns:
            Consolidated grades DataFrame
        """
        logger.info("Processing assignments in memory...")
        all_grades = []
        assignment_info = []
        students_with_repo_info = {}  # Store student data with repository info
        assignment_fork_dates = {}  # Store (username, assignment) -> fork_created_at mapping
        assignment_fork_updated = {}  # Store (username, assignment) -> fork_updated_at mapping
        assignment_attempts = []  # Store workflow run attempts data
        
        for assignment_id, assignment_name, assignment_repo in assignment_data:
            logger.info(f"Processing assignment: {assignment_name} (ID: {assignment_id})")
            
            try:
                # Download grades
                df = self.download_grades_to_dataframe(assignment_id)
                
                if df is not None and not df.empty:
                    # Format assignment name
                    formatted_name = self.format_assignment_name(assignment_name)
                    
                    # Store assignment info - use max points_available instead of first record
                    if 'points_available' in df.columns:
                        # Get the maximum points_available from all records
                        points_available = df['points_available'].max()
                        
                        # If max is 0 or NaN, try to get a non-zero value
                        if points_available == 0 or pd.isna(points_available):
                            non_zero_points = df[df['points_available'] > 0]['points_available']
                            if not non_zero_points.empty:
                                points_available = non_zero_points.iloc[0]
                            else:
                                # Special case: if this is Part 2 and points_available is 0, use 100 as default
                                # This handles cases where GitHub Classroom API returns 0 but the assignment actually has points
                                if 'part-2' in formatted_name.lower():
                                    points_available = 100
                                    logger.info(f"Assignment {formatted_name} - Using default 100 points for Part 2 (API returned 0)")
                                else:
                                    points_available = None
                                    logger.warning(f"Assignment {formatted_name} - No non-zero points_available found")
                    else:
                        points_available = None
                        logger.warning(f"Assignment {formatted_name} - No points_available column found")
                    
                    assignment_info.append({
                        'name': formatted_name,
                        'points_available': points_available
                    })
                    
                    # Process grades data and get repository info
                    grades_df = df[['github_username', 'points_awarded', 'points_available']].copy()
                    grades_df['assignment_name'] = formatted_name
                    grades_df = grades_df[['github_username', 'assignment_name', 'points_awarded']]
                    
                    # Get repository information for each student for THIS assignment
                    logger.info(f"Processing {len(df)} students for assignment {formatted_name}...")
                    for _, row in df.iterrows():
                        github_username = str(row['github_username']).strip()
                        student_repo_url = row.get('student_repository_url', '')
                        points_awarded = row.get('points_awarded', 0)

                        # Highlight tracked username if configured
                        if self.config.search_username and github_username.lower() == self.config.search_username.lower():
                            logger.info(f"  ★ TRACKED USER: {github_username} - {formatted_name}: {points_awarded} points")

                        # Log specific student progress (useful for debugging)
                        logger.debug(f"  → {github_username}: {points_awarded} points")

                        if student_repo_url:
                            logger.debug(f"Getting repo info for assignment: {formatted_name}")

                            # Get repository information
                            repo_info = self.get_repository_info(student_repo_url)

                            # Get workflow runs (GitHub Actions attempts)
                            workflow_info = self.get_workflow_runs(student_repo_url)

                            if repo_info:
                                # Verify this is actually a fork (has parent repository)
                                if repo_info.get('is_fork', False):
                                    # Store fork dates for this specific assignment
                                    assignment_fork_dates[(github_username, formatted_name)] = repo_info['created_at']
                                    assignment_fork_updated[(github_username, formatted_name)] = repo_info['updated_at']

                                    logger.debug(f"Fork found for assignment: {formatted_name}")

                                    # Store workflow attempts data if available
                                    if workflow_info:
                                        assignment_attempts.append({
                                            'github_username': github_username,
                                            'assignment_name': formatted_name,
                                            'repo_url': student_repo_url,
                                            'total_attempts': workflow_info['total_attempts'],
                                            'successful_attempts': workflow_info['successful_attempts'],
                                            'failed_attempts': workflow_info['failed_attempts'],
                                            'first_attempt_at': workflow_info['first_attempt_at'],
                                            'last_attempt_at': workflow_info['last_attempt_at'],
                                            'fork_created_at': repo_info['created_at'],
                                            'fork_updated_at': repo_info['updated_at']
                                        })
                                        logger.debug(f"Recorded {workflow_info['total_attempts']} workflow attempts for {github_username}")

                                    # Also update students_with_repo_info if not already set (for students table)
                                    if github_username not in students_with_repo_info:
                                        resolution_time = self.calculate_resolution_time(
                                            repo_info['created_at'],
                                            repo_info['updated_at']
                                        )

                                        students_with_repo_info[github_username] = {
                                            'github_username': github_username,
                                            'fork_created_at': repo_info['created_at'],
                                            'last_updated_at': repo_info['updated_at'],
                                            'resolution_time_hours': resolution_time,
                                            'has_fork': True
                                        }
                                else:
                                    # Repository exists but is not a fork
                                    logger.debug(f"Repository exists but is NOT a fork")
                                    if github_username not in students_with_repo_info:
                                        students_with_repo_info[github_username] = {
                                            'github_username': github_username,
                                            'fork_created_at': None,
                                            'last_updated_at': None,
                                            'resolution_time_hours': None,
                                            'has_fork': False
                                        }
                            else:
                                logger.debug(f"No fork exists for this student")
                                # Add student without repo info
                                if github_username not in students_with_repo_info:
                                    students_with_repo_info[github_username] = {
                                        'github_username': github_username,
                                        'fork_created_at': None,
                                        'last_updated_at': None,
                                        'resolution_time_hours': None,
                                        'has_fork': False
                                    }

                            # Add small delay to respect GitHub API rate limits
                            time.sleep(0.1)

                    # Add fork dates columns to grades_df
                    grades_df['fork_created_at'] = grades_df['github_username'].apply(
                        lambda username: assignment_fork_dates.get((username, formatted_name))
                    )
                    grades_df['fork_updated_at'] = grades_df['github_username'].apply(
                        lambda username: assignment_fork_updated.get((username, formatted_name))
                    )

                    all_grades.append(grades_df)
                    logger.info(f"Processed {len(grades_df)} grades for assignment: {formatted_name}")
                else:
                    logger.warning(f"No grades data for assignment: {assignment_name}")
                    
            except Exception as e:
                logger.error(f"Error processing assignment {assignment_name}: {e}")
                continue
        
        # Consolidate all grades
        if all_grades:
            consolidated_df = pd.concat(all_grades, ignore_index=True)
            logger.info(f"Consolidated {len(consolidated_df)} total grade records")
            
            # Sync to Supabase
            try:
                self.sync_assignments_to_supabase(assignment_info)
                self.sync_students_to_supabase(list(students_with_repo_info.values()))
                self.sync_grades_to_supabase(consolidated_df)
                self.sync_assignment_attempts_to_supabase(assignment_attempts)
                self.refresh_admin_leaderboard()
            except SupabaseSyncError as e:
                logger.error(f"Failed to sync data to Supabase: {e}")
                raise
            
            return consolidated_df
        else:
            logger.warning("No grades data found for any assignments")
            return pd.DataFrame()
    
    def run_sync(self) -> None:
        """
        Main method to run the complete sync process.

        Raises:
            GitHubCLIError: If GitHub CLI operations fail
            SupabaseSyncError: If Supabase operations fail
            DataValidationError: If data validation fails
        """
        logger.info("=" * 60)
        logger.info("Starting GitHub Classroom sync to Supabase")
        logger.info("=" * 60)

        try:
            # Get classroom ID
            classroom_id = self.get_classroom_id(self.config.classroom_name)
            if not classroom_id:
                raise GitHubCLIError(f"Classroom '{self.config.classroom_name}' not found")

            # Get assignments
            assignment_data = self.get_assignments(classroom_id)
            if not assignment_data:
                logger.warning("No assignments found")
                return

            # Filter by specific assignment ID if provided
            if self.config.assignment_id:
                assignment_data = [a for a in assignment_data if a[0] == self.config.assignment_id]
                logger.info(f"Filtered to specific assignment ID: {self.config.assignment_id}")

            # Process assignments
            consolidated_df = self.process_assignments_in_memory(assignment_data)

            # Print summary
            logger.info("=" * 60)
            if not consolidated_df.empty:
                unique_students = len(consolidated_df['github_username'].unique())
                unique_assignments = len(consolidated_df['assignment_name'].unique())

                logger.info("✓ Sync completed successfully!")
                logger.info(f"  • {unique_students} students")
                logger.info(f"  • {unique_assignments} assignments")
                logger.info(f"  • {len(consolidated_df)} grade records")
                logger.info("")
                logger.info("Check your Supabase dashboard to verify the changes")
            else:
                logger.warning("Sync completed but no data was processed")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"Error during sync process: {e}")
            raise

def create_config_from_env() -> SyncConfig:
    """Create SyncConfig from environment variables."""
    required_vars = ['SUPABASE_URL', 'SUPABASE_KEY', 'CLASSROOM_NAME']
    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        raise ValueError(f"Missing required environment variables: {missing_vars}")

    # Check for GitHub token (optional but recommended)
    github_token = os.getenv('GITHUB_TOKEN')
    if not github_token:
        logger.warning("GITHUB_TOKEN not found. Repository information will be limited by rate limits.")

    search_username = os.getenv('SEARCH_USERNAME')
    if search_username:
        logger.info(f"Tracking user: {search_username}")

    return SyncConfig(
        supabase_url=os.getenv('SUPABASE_URL'),
        supabase_key=os.getenv('SUPABASE_KEY'),
        classroom_name=os.getenv('CLASSROOM_NAME'),
        assignment_id=os.getenv('ASSIGNMENT_ID'),
        log_level=os.getenv('LOG_LEVEL', 'INFO'),
        max_retries=int(os.getenv('MAX_RETRIES', '3')),
        timeout_seconds=int(os.getenv('TIMEOUT_SECONDS', '30')),
        search_username=search_username
    )

def main():
    """Main function to run the sync process."""
    try:
        config = create_config_from_env()
        sync_client = ClassroomSupabaseSync(config)
        sync_client.run_sync()
        logger.info("Sync process completed successfully")
        
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)
    except (GitHubCLIError, SupabaseSyncError, DataValidationError) as e:
        logger.error(f"Sync error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()